import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { AppError } from '@/shared/errors/app-error';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreateAdvanceSchema = z.object({
  employeeId: z.string().uuid(),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  deductionPeriod: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Formato YYYY-MM requerido'),
  reason: z.string().max(300).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;

    const advances = await prisma.advancePayment.findMany({
      where,
      include: {
        employee: {
          select: { id: true, code: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(createSuccessResponse(advances));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'ADVANCES_FETCH_ERROR'),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateAdvanceSchema.parse(body);

    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
      include: { salaryStructure: true },
    });

    if (!employee) {
      return NextResponse.json(
        createErrorResponse('Empleado no encontrado', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    const weeklySalary = Number(employee.salaryStructure?.weeklySalary || 0);
    const maxAllowed = weeklySalary * 0.7; // Tope máximo del 70% del salario semanal

    if (weeklySalary > 0 && data.amount > maxAllowed) {
      return NextResponse.json(
        createErrorResponse(
          `El adelanto solicitado supera el tope permitido del 70% del salario semanal (Máx: ₲ ${maxAllowed.toLocaleString('es-PY')})`,
          'ADVANCE_LIMIT_EXCEEDED'
        ),
        { status: 400 }
      );
    }

    const advance = await prisma.advancePayment.create({
      data: {
        employeeId: data.employeeId,
        amount: data.amount,
        deductionPeriod: data.deductionPeriod,
        reason: data.reason?.trim() || 'Solicitud de anticipo de fondos',
        status: 'APPROVED', // Aprobado automáticamente si no excede el límite
      },
    });

    return NextResponse.json(createSuccessResponse(advance), { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('Datos de adelanto inválidos', 'VALIDATION_ERROR', error.errors),
        { status: 422 }
      );
    }
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json(
      createErrorResponse(error.message, error.code || 'ADVANCE_ERROR'),
      { status: statusCode }
    );
  }
}


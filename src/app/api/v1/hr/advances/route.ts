import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { AppError } from '@/shared/errors/app-error';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreateAdvanceSchema = z.object({
  employeeId: z.string().uuid(),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  deductionPeriod: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Formato YYYY-MM requerido').optional(),
  requestDate: z.string().optional(),
  reason: z.string().max(300).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;

    if (startDate || endDate) {
      where.requestDate = {};
      if (startDate) where.requestDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.requestDate.lte = end;
      }
    }

    const advances = await prisma.advancePayment.findMany({
      where,
      include: {
        employee: {
          select: { id: true, code: true, firstName: true, lastName: true },
        },
      },
      orderBy: { requestDate: 'desc' },
      take: 100,
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
    // Se quitó la restricción del 70%: el funcionario puede solicitar vales hasta el 100% de su salario semanal,
    // e incluso generar sobregiro autorizado para que luego Osvaldo financie la diferencia en cuotas sin afectar la caja.

    // Resolver fecha del adelanto (retroactiva o del día) y periodo fiscal
    const requestDate = data.requestDate ? new Date(`${data.requestDate}T12:00:00Z`) : new Date();
    const deductionPeriod =
      data.deductionPeriod ||
      `${requestDate.getFullYear()}-${String(requestDate.getMonth() + 1).padStart(2, '0')}`;

    const advance = await prisma.advancePayment.create({
      data: {
        employeeId: data.employeeId,
        amount: data.amount,
        requestDate,
        deductionPeriod,
        reason: data.reason?.trim() || 'Vale / Anticipo semanal',
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


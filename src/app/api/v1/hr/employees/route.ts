import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { AppError } from '@/shared/errors/app-error';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreateEmployeeSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  documentNumber: z.string().min(5),
  jobTitle: z.string().min(2),
  department: z.string().default('Operaciones'),
  phone: z.string().optional().nullable(),
  weeklySalary: z.number().positive('El salario semanal debe ser mayor a 0'),
  birthDate: z.string().optional().nullable(),
  hireDate: z.string().optional().nullable(),
  biometricId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { documentNumber: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        salaryStructure: true,
        advancePayments: {
          where: { status: { in: ['REQUESTED', 'APPROVED'] } },
        },
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json(createSuccessResponse(employees));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'EMPLOYEES_FETCH_ERROR'),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateEmployeeSchema.parse(body);

    const count = await prisma.employee.count();
    const code = `EMP-${(count + 1).toString().padStart(3, '0')}`;
    const biometricId = data.biometricId || `BIO-4M-${(count + 1).toString().padStart(3, '0')}`;

    const employee = await prisma.employee.create({
      data: {
        code,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        documentNumber: data.documentNumber.replace(/\./g, '').trim(),
        jobTitle: data.jobTitle.trim(),
        department: data.department.trim(),
        phone: data.phone?.trim() || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : new Date('1990-01-01'),
        hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
        biometricId,
        salaryStructure: {
          create: {
            weeklySalary: data.weeklySalary,
            baseSalary: data.weeklySalary * 4.3333,
            currency: 'PYG',
            ipsDeductionPercent: 9.0,
            paymentFrequency: 'WEEKLY',
          },
        },
      },
      include: { salaryStructure: true },
    });

    return NextResponse.json(createSuccessResponse(employee), { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('Datos de empleado inválidos', 'VALIDATION_ERROR', error.errors),
        { status: 422 }
      );
    }
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json(
      createErrorResponse(error.message, error.code || 'EMPLOYEE_CREATE_ERROR'),
      { status: statusCode }
    );
  }
}


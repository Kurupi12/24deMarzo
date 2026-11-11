import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateEmployeeSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').optional(),
  documentNumber: z.string().min(5, 'La cédula debe tener al menos 5 dígitos').optional(),
  jobTitle: z.string().min(2, 'El cargo es requerido').optional(),
  department: z.string().optional(),
  phone: z.string().optional().nullable(),
  weeklySalary: z.number().positive('El salario semanal debe ser mayor a 0').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED']).optional(),
  birthDate: z.string().optional().nullable(),
  hireDate: z.string().optional().nullable(),
  biometricId: z.string().optional().nullable(),
});

interface RouteParams {
  params: { id: string };
}

// GET /api/v1/hr/employees/[id]
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        salaryStructure: true,
        advancePayments: {
          orderBy: { requestDate: 'desc' },
          take: 10,
        },
        loans: {
          include: { installments: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        createErrorResponse('Funcionario no encontrado', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    return NextResponse.json(createSuccessResponse(employee));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'EMPLOYEE_FETCH_ERROR'),
      { status: 500 }
    );
  }
}

// PATCH /api/v1/hr/employees/[id]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const body = await req.json();
    const data = UpdateEmployeeSchema.parse(body);

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        createErrorResponse('Funcionario no encontrado', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    // Si se actualiza la cédula, validar que no esté duplicada con otro funcionario
    if (data.documentNumber && data.documentNumber !== existing.documentNumber) {
      const cleanDoc = data.documentNumber.replace(/\./g, '').trim();
      const duplicate = await prisma.employee.findFirst({
        where: {
          documentNumber: cleanDoc,
          id: { not: id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          createErrorResponse(`La cédula ${data.documentNumber} ya está registrada en el funcionario ${duplicate.firstName} ${duplicate.lastName} (${duplicate.code})`, 'DUPLICATE_DOCUMENT'),
          { status: 409 }
        );
      }
    }

    const updateData: any = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName.trim();
    if (data.lastName !== undefined) updateData.lastName = data.lastName.trim();
    if (data.documentNumber !== undefined) updateData.documentNumber = data.documentNumber.replace(/\./g, '').trim();
    if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle.trim();
    if (data.department !== undefined) updateData.department = data.department.trim();
    if (data.phone !== undefined) updateData.phone = data.phone ? data.phone.trim() : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.biometricId !== undefined) updateData.biometricId = data.biometricId ? data.biometricId.trim() : null;
    if (data.birthDate !== undefined) updateData.birthDate = data.birthDate ? new Date(data.birthDate) : undefined;
    if (data.hireDate !== undefined) updateData.hireDate = data.hireDate ? new Date(data.hireDate) : undefined;

    const [updatedEmployee] = await prisma.$transaction([
      prisma.employee.update({
        where: { id },
        data: updateData,
        include: { salaryStructure: true },
      }),
      ...(data.weeklySalary !== undefined
        ? [
            prisma.salaryStructure.upsert({
              where: { employeeId: id },
              create: {
                employeeId: id,
                weeklySalary: data.weeklySalary,
                baseSalary: data.weeklySalary * 4.3333,
                currency: 'PYG',
                ipsDeductionPercent: 9.0,
                paymentFrequency: 'WEEKLY',
              },
              update: {
                weeklySalary: data.weeklySalary,
                baseSalary: data.weeklySalary * 4.3333,
              },
            }),
          ]
        : []),
    ]);

    // Recargar con estructura salarial actualizada
    const reloaded = await prisma.employee.findUnique({
      where: { id },
      include: {
        salaryStructure: true,
        advancePayments: {
          where: { status: { in: ['REQUESTED', 'APPROVED'] } },
        },
      },
    });

    return NextResponse.json(createSuccessResponse(reloaded));
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('Datos inválidos', 'VALIDATION_ERROR', error.errors),
        { status: 422 }
      );
    }
    return NextResponse.json(
      createErrorResponse(error.message, 'EMPLOYEE_UPDATE_ERROR'),
      { status: 500 }
    );
  }
}

// DELETE /api/v1/hr/employees/[id]
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        loans: {
          where: { status: 'ACTIVE' },
        },
        salaryStructure: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        createErrorResponse('Funcionario no encontrado', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    // Verificar si tiene préstamos activos con saldo pendiente
    const activeDebt = employee.loans.reduce((sum, l) => sum + Number(l.remainingBalance), 0);
    if (activeDebt > 0) {
      return NextResponse.json(
        createErrorResponse(
          `No se puede eliminar a ${employee.firstName} ${employee.lastName} porque tiene préstamos activos con un saldo pendiente de Gs. ${activeDebt.toLocaleString('es-PY')}. Debes saldar o cancelar el préstamo antes de eliminar el legajo.`,
          'HAS_ACTIVE_DEBT'
        ),
        { status: 400 }
      );
    }

    // Transacción atómica de desvinculación y eliminación segura
    await prisma.$transaction(async (tx) => {
      // 1. Desvincular de ventas donde haya sido chofer o ayudante
      await tx.sale.updateMany({
        where: { driverId: id },
        data: { driverId: null },
      });
      await tx.sale.updateMany({
        where: { secondaryDriverId: id },
        data: { secondaryDriverId: null },
      });

      // 2. Eliminar asistencias y marcaciones biométricas
      await tx.attendanceRecord.deleteMany({
        where: { employeeId: id },
      });

      // 3. Eliminar cuotas de préstamos y préstamos
      const employeeLoans = await tx.employeeLoan.findMany({
        where: { employeeId: id },
        select: { id: true },
      });
      const loanIds = employeeLoans.map((l) => l.id);
      if (loanIds.length > 0) {
        await tx.loanInstallment.deleteMany({
          where: { loanId: { in: loanIds } },
        });
        await tx.employeeLoan.deleteMany({
          where: { employeeId: id },
        });
      }

      // 4. Eliminar adelantos salariales / vales
      await tx.advancePayment.deleteMany({
        where: { employeeId: id },
      });

      // 5. Eliminar solicitudes de permisos
      await tx.leaveRequest.deleteMany({
        where: { employeeId: id },
      });

      // 6. Eliminar estructura salarial
      await tx.salaryStructure.deleteMany({
        where: { employeeId: id },
      });

      // 7. Finalmente eliminar el funcionario
      await tx.employee.delete({
        where: { id },
      });
    });

    return NextResponse.json(
      createSuccessResponse({
        id,
        deleted: true,
        message: `El funcionario ${employee.firstName} ${employee.lastName} (${employee.code}) fue eliminado correctamente de la plantilla.`,
      })
    );
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'EMPLOYEE_DELETE_ERROR'),
      { status: 500 }
    );
  }
}


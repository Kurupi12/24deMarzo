import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { getSessionUser } from '@/lib/auth/session';
import { VehicleExpenseCategory, VehicleMaintenanceType } from '@prisma/client';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function isAdminRole(role?: string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const expense = await prisma.vehicleExpense.findUnique({
      where: { id },
      include: {
        vehicle: true,
      },
    });

    if (!expense) {
      return NextResponse.json(createErrorResponse('Registro de gasto no encontrado', 'NOT_FOUND'), { status: 404 });
    }

    return NextResponse.json(createSuccessResponse(expense));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message || 'Error al obtener registro de gasto', 'EXPENSE_GET_ERROR'),
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    const role = sessionUser?.role || req.headers.get('x-user-role');
    if (!isAdminRole(role)) {
      return NextResponse.json(
        createErrorResponse(
          'Acceso denegado: solo el Administrador (Osvaldo) puede editar detalles de gastos de vehículos.',
          'FORBIDDEN_EXPENSE_EDIT'
        ),
        { status: 403 }
      );
    }

    const { id } = params;
    const existing = await prisma.vehicleExpense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(createErrorResponse('Registro de gasto no encontrado', 'NOT_FOUND'), { status: 404 });
    }

    const body = await req.json();
    const {
      vehicleId,
      date,
      category,
      maintenanceType,
      description,
      partsCost,
      laborCost,
      totalCost,
      fuelLiters,
      fuelPricePerLiter,
      supplierOrWorkshop,
      receiptNumber,
      notes,
    } = body;

    if (!vehicleId) {
      return NextResponse.json(createErrorResponse('Debe seleccionar un vehículo', 'VALIDATION_ERROR'), { status: 422 });
    }
    if (!category) {
      return NextResponse.json(createErrorResponse('Debe indicar la categoría del gasto', 'VALIDATION_ERROR'), { status: 422 });
    }
    if (!description || !String(description).trim()) {
      return NextResponse.json(createErrorResponse('La descripción o detalle del trabajo es obligatoria', 'VALIDATION_ERROR'), { status: 422 });
    }

    const parts = Number(partsCost || 0);
    const labor = Number(laborCost || 0);
    const calculatedTotal =
      totalCost !== undefined && totalCost !== null && Number(totalCost) > 0
        ? Number(totalCost)
        : parts + labor;

    if (calculatedTotal <= 0) {
      return NextResponse.json(createErrorResponse('El monto total debe ser mayor a 0', 'VALIDATION_ERROR'), { status: 422 });
    }

    const expenseDate = date
      ? String(date).includes('T')
        ? new Date(date)
        : new Date(`${date}T12:00:00Z`)
      : existing.date;

    const actorName = sessionUser?.name || 'Administrador';
    const rawExistingNotes = existing.notes || '';
    const cashTag = rawExistingNotes.match(/\[CASH_MOV:[^\]]+\]/)?.[0] || null;
    const userTag = rawExistingNotes.match(/\[USER:[^\]]+\]/)?.[0] || `[USER:${actorName}]`;
    const fueraCajaTag = rawExistingNotes.includes('[FUERA_DE_CAJA]') ? '[FUERA_DE_CAJA]' : null;

    const auditSummary = [
      cashTag,
      userTag,
      fueraCajaTag,
      cashTag ? `Descontado de Caja` : `Pagado fuera de caja`,
    ]
      .filter(Boolean)
      .join(' ');

    const finalNotes = [notes?.trim(), auditSummary].filter(Boolean).join(' — ') || null;

    const updated = await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({
        where: { id: vehicleId },
        select: { plateNumber: true },
      });

      const cashMovMatch = rawExistingNotes.match(/\[CASH_MOV:([^\]]+)\]/);
      if (cashMovMatch?.[1]) {
        const mov = await tx.cashMovement.findUnique({
          where: { id: cashMovMatch[1] },
          include: { shift: { select: { isOpen: true } } },
        });
        if (mov) {
          if (!mov.shift?.isOpen && calculatedTotal !== Number(existing.totalCost)) {
            throw new AppError(
              'Este gasto ya quedó en una Caja cerrada; podés editar descripción, taller, comprobante o fecha, pero no el monto para no alterar el arqueo cerrado.',
              403,
              'CLOSED_SHIFT_AMOUNT_LOCKED'
            );
          }
          if (mov.shift?.isOpen) {
            await tx.cashMovement.update({
              where: { id: mov.id },
              data: {
                category: `FLOTA_${category}`,
                amount: calculatedTotal,
                description: `Gasto Vehículo (${vehicle?.plateNumber || 'Flota'}): ${String(description).trim()}`,
                beneficiary: supplierOrWorkshop?.trim() || null,
                receiptNo: receiptNumber?.trim() || null,
              },
            });
          }
        }
      }

      return tx.vehicleExpense.update({
        where: { id },
        data: {
          vehicleId,
          date: expenseDate,
          category: category as VehicleExpenseCategory,
          maintenanceType: category === 'MANTENIMIENTO' && maintenanceType ? (maintenanceType as VehicleMaintenanceType) : null,
          description: String(description).trim(),
          partsCost: parts,
          laborCost: labor,
          totalCost: calculatedTotal,
          fuelLiters: fuelLiters ? Number(fuelLiters) : null,
          fuelPricePerLiter: fuelPricePerLiter ? Number(fuelPricePerLiter) : null,
          supplierOrWorkshop: supplierOrWorkshop?.trim() || null,
          receiptNumber: receiptNumber?.trim() || null,
          notes: finalNotes,
        },
        include: {
          vehicle: true,
        },
      });
    });

    return NextResponse.json(createSuccessResponse(updated));
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        createErrorResponse(error.message, error.code || 'EXPENSE_UPDATE_ERROR'),
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      createErrorResponse(error.message || 'Error al actualizar registro de gasto', 'EXPENSE_UPDATE_ERROR'),
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    const role = sessionUser?.role || req.headers.get('x-user-role');
    if (!isAdminRole(role)) {
      return NextResponse.json(
        createErrorResponse(
          'Acceso denegado: solo el Administrador puede eliminar registros de gastos de vehículos.',
          'FORBIDDEN_EXPENSE_DELETE'
        ),
        { status: 403 }
      );
    }

    const { id } = params;

    const existing = await prisma.vehicleExpense.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(createErrorResponse('Registro no encontrado o ya eliminado', 'NOT_FOUND'), { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const cashMovMatch = existing.notes?.match(/\[CASH_MOV:([^\]]+)\]/);
      if (cashMovMatch?.[1]) {
        const mov = await tx.cashMovement.findUnique({
          where: { id: cashMovMatch[1] },
          include: { shift: { select: { isOpen: true } } },
        });
        if (mov && mov.shift?.isOpen) {
          await tx.cashMovement.delete({ where: { id: mov.id } });
        }
      }

      await tx.vehicleExpense.delete({
        where: { id },
      });
    });

    return NextResponse.json(createSuccessResponse({ success: true, id }));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message || 'Error al eliminar registro de gasto', 'EXPENSE_DELETE_ERROR'),
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { VehicleExpenseCategory, VehicleMaintenanceType } from '@prisma/client';
import { recordCashOutflowOnOpenShift } from '@/modules/billing/utils/cash-movement-sync';
import { AppError } from '@/shared/errors/app-error';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

function parseExpenseAudit(notes: string | null) {
  const raw = notes || '';
  const userMatch = raw.match(/\[USER:([^\]]+)\]/);
  const cashMatch = raw.match(/\[CASH_MOV:([^\]]+)\]/);
  const cleanNotes = raw
    .replace(/\[CASH_MOV:[^\]]+\]/g, '')
    .replace(/\[USER:[^\]]+\]/g, '')
    .replace(/\[FUERA_DE_CAJA\]/g, '')
    .replace(/Descontado de Caja(?:\s+del\s+Día|\s*\([^)]+\))?/gi, '')
    .replace(/Pagado fuera de caja(?:\s*\([^)]+\))?/gi, '')
    .replace(/^[\s—-]+|[\s—-]+$/g, '')
    .trim();

  return {
    recordedBy: userMatch?.[1]?.trim() || null,
    paidFromCashShift: Boolean(cashMatch?.[1]),
    cleanNotes: cleanNotes || null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get('vehicleId');
    const category = searchParams.get('category') as VehicleExpenseCategory | null;
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    if (category) {
      where.category = category;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { supplierOrWorkshop: { contains: search, mode: 'insensitive' } },
        { receiptNumber: { contains: search, mode: 'insensitive' } },
        { vehicle: { plateNumber: { contains: search, mode: 'insensitive' } } },
        { vehicle: { brand: { contains: search, mode: 'insensitive' } } },
        { vehicle: { model: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const expenses = await prisma.vehicleExpense.findMany({
      where,
      include: {
        vehicle: true,
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Totales calculados
    let totalExpenses = 0;
    let totalParts = 0;
    let totalLabor = 0;
    let totalFuel = 0;
    let totalMaintenance = 0;
    let totalRepairs = 0;
    let totalTires = 0;

    for (const exp of expenses) {
      const tot = Number(exp.totalCost);
      totalExpenses += tot;
      totalParts += Number(exp.partsCost);
      totalLabor += Number(exp.laborCost);

      if (exp.category === 'COMBUSTIBLE') totalFuel += tot;
      else if (exp.category === 'MANTENIMIENTO') totalMaintenance += tot;
      else if (exp.category === 'REPARACION') totalRepairs += tot;
      else if (exp.category === 'CUBIERTAS') totalTires += tot;
    }

    return NextResponse.json(
      createSuccessResponse({
        expenses: expenses.map((exp) => ({
          ...exp,
          ...parseExpenseAudit(exp.notes),
        })),
        summary: {
          totalExpenses,
          totalParts,
          totalLabor,
          totalFuel,
          totalMaintenance,
          totalRepairs,
          totalTires,
          count: expenses.length,
        },
      })
    );
  } catch (error: any) {
    console.error('Error fetching vehicle expenses:', error);
    return NextResponse.json(
      createErrorResponse(error.message || 'Error al obtener gastos de vehículos', 'EXPENSES_FETCH_ERROR'),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
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
      deductFromCashShift,
    } = body;

    if (!vehicleId) {
      return NextResponse.json(createErrorResponse('Debe seleccionar un vehículo', 'VALIDATION_ERROR'), { status: 422 });
    }
    if (!category) {
      return NextResponse.json(createErrorResponse('Debe indicar la categoría del gasto', 'VALIDATION_ERROR'), { status: 422 });
    }
    if (!description || description.trim() === '') {
      return NextResponse.json(createErrorResponse('La descripción o detalle del trabajo es obligatoria', 'VALIDATION_ERROR'), { status: 422 });
    }

    const parts = Number(partsCost || 0);
    const labor = Number(laborCost || 0);
    const calculatedTotal = totalCost !== undefined && totalCost !== null && Number(totalCost) > 0
      ? Number(totalCost)
      : parts + labor;

    const expenseDate = date
      ? date.includes('T')
        ? new Date(date)
        : new Date(`${date}T12:00:00Z`)
      : new Date();
    const sessionUser = await getSessionUser();
    const fallbackUserId = req.headers.get('x-user-id');
    const actorId = sessionUser?.id || fallbackUserId || null;

    const actor = actorId
      ? await prisma.user.findUnique({
          where: { id: actorId },
          select: { id: true, name: true, role: true },
        })
      : null;

    const actorName = actor?.name || sessionUser?.name || 'Operador';
    const actorTag = `[USER:${actorName}]`;

    const created = await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({
        where: { id: vehicleId },
        select: { plateNumber: true, brand: true, model: true },
      });

      let cashNote = `${actorTag} [FUERA_DE_CAJA] Pagado fuera de caja (${actorName})`;
      if (deductFromCashShift && calculatedTotal > 0) {
        const plate = vehicle?.plateNumber || 'Flota';
        const mov = await recordCashOutflowOnOpenShift(tx, {
          type: 'EXPENSE_OPERATION',
          category: `FLOTA_${category}`,
          amount: calculatedTotal,
          description: `Gasto Vehículo (${plate}): ${description.trim()} [Por: ${actorName}]`,
          beneficiary: supplierOrWorkshop?.trim() || null,
          receiptNo: receiptNumber?.trim() || null,
          expectedUserId: actorId,
          enforceShiftOwner: true,
        });
        if (mov) {
          cashNote = `[CASH_MOV:${mov.id}] ${actorTag} Descontado de Caja (${actorName})`;
        }
      }

      const finalNotes = [notes?.trim(), cashNote].filter(Boolean).join(' — ') || null;

      return tx.vehicleExpense.create({
        data: {
          vehicleId,
          date: expenseDate,
          category: category as VehicleExpenseCategory,
          maintenanceType: maintenanceType ? (maintenanceType as VehicleMaintenanceType) : null,
          description: description.trim(),
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

    return NextResponse.json(createSuccessResponse(created));
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        createErrorResponse(error.message, error.code || 'EXPENSE_CREATE_ERROR'),
        { status: error.statusCode }
      );
    }
    console.error('Error creating vehicle expense:', error);
    return NextResponse.json(
      createErrorResponse(error.message || 'Error al registrar gasto de vehículo', 'EXPENSE_CREATE_ERROR'),
      { status: 500 }
    );
  }
}


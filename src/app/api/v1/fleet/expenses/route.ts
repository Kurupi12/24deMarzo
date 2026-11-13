import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { VehicleExpenseCategory, VehicleMaintenanceType } from '@prisma/client';

export const dynamic = 'force-dynamic';

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
        expenses,
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

    const expenseDate = date ? new Date(date) : new Date();

    const created = await prisma.vehicleExpense.create({
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
        notes: notes?.trim() || null,
      },
      include: {
        vehicle: true,
      },
    });

    return NextResponse.json(createSuccessResponse(created));
  } catch (error: any) {
    console.error('Error creating vehicle expense:', error);
    return NextResponse.json(
      createErrorResponse(error.message || 'Error al registrar gasto de vehículo', 'EXPENSE_CREATE_ERROR'),
      { status: 500 }
    );
  }
}


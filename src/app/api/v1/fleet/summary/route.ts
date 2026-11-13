import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

export const dynamic = 'force-dynamic';

function getMonthsDifference(fromDate: Date, toDate: Date): number {
  const months = (toDate.getFullYear() - fromDate.getFullYear()) * 12 + (toDate.getMonth() - fromDate.getMonth());
  return Math.max(0, months);
}

export async function GET(req: NextRequest) {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      include: {
        expenses: {
          orderBy: { date: 'desc' },
        },
      },
    });

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const vehicleSummaries = vehicles.map((v) => {
      let totalCurrentMonth = 0;
      let totalAllTime = 0;
      let totalFuel = 0;
      let totalMaintenance = 0;
      let totalRepairs = 0;
      let totalTires = 0;
      let totalParts = 0;
      let totalLabor = 0;

      let lastMotorOilChange: Date | null = null;
      let lastGearboxOilChange: Date | null = null;
      let lastTiresChange: Date | null = null;
      let lastFuelDate: Date | null = null;

      for (const exp of v.expenses) {
        const cost = Number(exp.totalCost);
        totalAllTime += cost;
        totalParts += Number(exp.partsCost);
        totalLabor += Number(exp.laborCost);

        const expDate = new Date(exp.date);
        if (expDate >= currentMonthStart) {
          totalCurrentMonth += cost;
        }

        if (exp.category === 'COMBUSTIBLE') {
          totalFuel += cost;
          if (!lastFuelDate || expDate > lastFuelDate) lastFuelDate = expDate;
        } else if (exp.category === 'MANTENIMIENTO') {
          totalMaintenance += cost;
          if (exp.maintenanceType === 'ACEITE_MOTOR' || exp.maintenanceType === 'MANTENIMIENTO_COMPLETO') {
            if (!lastMotorOilChange || expDate > lastMotorOilChange) lastMotorOilChange = expDate;
          }
          if (exp.maintenanceType === 'ACEITE_CAJA_DIFERENCIAL') {
            if (!lastGearboxOilChange || expDate > lastGearboxOilChange) lastGearboxOilChange = expDate;
          }
          // Si no se especificó subtipo, se asume revisión de motor
          if (!exp.maintenanceType && (!lastMotorOilChange || expDate > lastMotorOilChange)) {
            lastMotorOilChange = expDate;
          }
        } else if (exp.category === 'REPARACION') {
          totalRepairs += cost;
        } else if (exp.category === 'CUBIERTAS') {
          totalTires += cost;
          if (!lastTiresChange || expDate > lastTiresChange) lastTiresChange = expDate;
        }
      }

      // Cálculo de alertas preventivas por fecha (para vehículos sin odómetro)
      const motorOilMonths = lastMotorOilChange ? getMonthsDifference(lastMotorOilChange, now) : null;
      const gearboxOilMonths = lastGearboxOilChange ? getMonthsDifference(lastGearboxOilChange, now) : null;

      let motorOilStatus: 'OK' | 'REVISION_SUGERIDA' | 'VENCIDO' | 'SIN_DATOS' = 'SIN_DATOS';
      if (motorOilMonths !== null) {
        if (motorOilMonths < 6) motorOilStatus = 'OK';
        else if (motorOilMonths <= 8) motorOilStatus = 'REVISION_SUGERIDA';
        else motorOilStatus = 'VENCIDO';
      }

      let gearboxOilStatus: 'OK' | 'REVISION_SUGERIDA' | 'VENCIDO' | 'SIN_DATOS' = 'SIN_DATOS';
      if (gearboxOilMonths !== null) {
        if (gearboxOilMonths < 12) gearboxOilStatus = 'OK';
        else if (gearboxOilMonths <= 18) gearboxOilStatus = 'REVISION_SUGERIDA';
        else gearboxOilStatus = 'VENCIDO';
      }

      return {
        id: v.id,
        code: v.code,
        plateNumber: v.plateNumber,
        brand: v.brand,
        model: v.model,
        capacityTons: v.capacityTons ? Number(v.capacityTons) : null,
        notes: v.notes,
        totalCurrentMonth,
        totalAllTime,
        totalFuel,
        totalMaintenance,
        totalRepairs,
        totalTires,
        totalParts,
        totalLabor,
        expenseCount: v.expenses.length,
        maintenanceDates: {
          lastMotorOilChange,
          motorOilMonths,
          motorOilStatus,
          lastGearboxOilChange,
          gearboxOilMonths,
          gearboxOilStatus,
          lastTiresChange,
          lastFuelDate,
        },
      };
    });

    // Totales globales de toda la flota
    const globalTotals = vehicleSummaries.reduce(
      (acc, curr) => {
        acc.totalMonth += curr.totalCurrentMonth;
        acc.totalAllTime += curr.totalAllTime;
        acc.totalFuel += curr.totalFuel;
        acc.totalMaintenance += curr.totalMaintenance;
        acc.totalRepairs += curr.totalRepairs;
        acc.totalTires += curr.totalTires;
        return acc;
      },
      {
        totalMonth: 0,
        totalAllTime: 0,
        totalFuel: 0,
        totalMaintenance: 0,
        totalRepairs: 0,
        totalTires: 0,
      }
    );

    return NextResponse.json(
      createSuccessResponse({
        vehicles: vehicleSummaries,
        globalTotals,
      })
    );
  } catch (error: any) {
    console.error('Error fetching fleet summary:', error);
    return NextResponse.json(
      createErrorResponse(error.message || 'Error al obtener resumen de flota', 'SUMMARY_FETCH_ERROR'),
      { status: 500 }
    );
  }
}


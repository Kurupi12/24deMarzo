import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    let vehicles = await prisma.vehicle.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });

    // Si la tabla está vacía, pre-sembrar la flota base del depósito
    if (vehicles.length === 0) {
      const initialVehicles = [
        { code: 'CAM-01', plateNumber: 'ABC-101', brand: 'Scania', model: '113H Volquete', capacityTons: 15, notes: 'Camión pesado para fletes de arena y piedra' },
        { code: 'CAM-02', plateNumber: 'DEF-202', brand: 'Mercedes-Benz', model: '1114 Volquete', capacityTons: 8, notes: 'Camión mediano para reparto de ladrillos y cemento' },
        { code: 'CAM-03', plateNumber: 'GHI-303', brand: 'Isuzu', model: 'Forward Baranda', capacityTons: 6, notes: 'Camión de reparto urbano' },
        { code: 'FUR-01', plateNumber: 'JKL-404', brand: 'Kia', model: 'K2700 Doble Cabina', capacityTons: 2.5, notes: 'Furgón liviano para entregas rápidas de ferretería' },
      ];

      for (const v of initialVehicles) {
        await prisma.vehicle.create({ data: v });
      }

      vehicles = await prisma.vehicle.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      });
    }

    return NextResponse.json(createSuccessResponse(vehicles));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'VEHICLES_FETCH_ERROR'),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, plateNumber, brand, model, capacityTons, notes } = body;

    if (!plateNumber || !brand || !model) {
      return NextResponse.json(
        createErrorResponse('Chapa, marca y modelo son obligatorios', 'VALIDATION_ERROR'),
        { status: 422 }
      );
    }

    // Generar código automático si no vino
    let vehicleCode = code;
    if (!vehicleCode) {
      const count = await prisma.vehicle.count();
      vehicleCode = `CAM-${(count + 1).toString().padStart(2, '0')}`;
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        code: vehicleCode.trim().toUpperCase(),
        plateNumber: plateNumber.trim().toUpperCase(),
        brand: brand.trim(),
        model: model.trim(),
        capacityTons: capacityTons ? Number(capacityTons) : null,
        notes: notes ? notes.trim() : null,
        isActive: true,
      },
    });

    return NextResponse.json(createSuccessResponse(vehicle), { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'VEHICLE_CREATE_ERROR'),
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, code, plateNumber, brand, model, capacityTons, notes, isActive } = body;

    if (!id) {
      return NextResponse.json(
        createErrorResponse('ID de vehículo obligatorio', 'VALIDATION_ERROR'),
        { status: 422 }
      );
    }

    const updated = await prisma.vehicle.update({
      where: { id },
      data: {
        code: code ? code.trim().toUpperCase() : undefined,
        plateNumber: plateNumber ? plateNumber.trim().toUpperCase() : undefined,
        brand: brand ? brand.trim() : undefined,
        model: model ? model.trim() : undefined,
        capacityTons: capacityTons !== undefined ? Number(capacityTons) : undefined,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    return NextResponse.json(createSuccessResponse(updated));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'VEHICLE_UPDATE_ERROR'),
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        createErrorResponse('ID de vehículo obligatorio', 'VALIDATION_ERROR'),
        { status: 422 }
      );
    }

    // Soft delete para preservar integridad histórica
    const deleted = await prisma.vehicle.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json(createSuccessResponse(deleted));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'VEHICLE_DELETE_ERROR'),
      { status: 500 }
    );
  }
}


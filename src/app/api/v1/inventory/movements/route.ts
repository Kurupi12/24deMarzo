import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '@/modules/inventory/services/inventory.service';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { AppError } from '@/shared/errors/app-error';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const inventoryService = new InventoryService();

const MovementSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid().optional(),
  movementType: z.enum([
    'IN_PURCHASE',
    'OUT_SALE',
    'TRANSFER_IN',
    'TRANSFER_OUT',
    'ADJUSTMENT_POSITIVE',
    'ADJUSTMENT_NEGATIVE',
    'INITIAL_STOCK',
  ]),
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  unitCost: z.number().min(0).default(0),
  notes: z.string().max(300).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = MovementSchema.parse(body);

    // Si no se especifica depósito, usamos el depósito principal
    let warehouseId = validated.warehouseId;
    if (!warehouseId) {
      const mainWarehouse = await prisma.warehouse.findFirst({
        where: { isMain: true },
        select: { id: true },
      });
      warehouseId = mainWarehouse?.id;
    }

    if (!warehouseId) {
      return NextResponse.json(
        createErrorResponse('No se encontró un depósito asignado', 'WAREHOUSE_NOT_FOUND'),
        { status: 400 }
      );
    }

    // Usuario que ejecuta el movimiento (o primer admin activo para la sesión)
    const adminUser = await prisma.user.findFirst({ select: { id: true } });
    const userId = req.headers.get('x-user-id') || adminUser?.id || '';

    const movement = await inventoryService.registerKardexMovement({
      productId: validated.productId,
      warehouseId,
      movementType: validated.movementType,
      quantity: validated.quantity,
      unitCost: validated.unitCost,
      notes: validated.notes,
      referenceType: 'AJUSTE_MANUAL',
      userId,
    });

    return NextResponse.json(createSuccessResponse(movement), { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('Datos de movimiento inválidos', 'VALIDATION_ERROR', error.errors),
        { status: 422 }
      );
    }
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json(
      createErrorResponse(error.message, error.code || 'KARDEX_ERROR'),
      { status: statusCode }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json(
        createErrorResponse('El parámetro productId es requerido', 'BAD_REQUEST'),
        { status: 400 }
      );
    }

    const movements = await prisma.stockMovement.findMany({
      where: { productId },
      include: {
        warehouse: { select: { name: true, code: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(createSuccessResponse(movements));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'KARDEX_FETCH_ERROR'),
      { status: 500 }
    );
  }
}


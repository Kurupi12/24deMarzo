import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '@/modules/inventory/services/inventory.service';
import { CreateProductSchema, UpdateProductSchema } from '@/modules/inventory/validators/product.schema';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { AppError } from '@/shared/errors/app-error';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const inventoryService = new InventoryService();

const UpdateSkuSchema = z.object({
  id: z.string().uuid(),
  sku: z.string().min(1, 'El SKU no puede estar vacío').max(50),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const vatRate = searchParams.get('vatRate') as any;
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 25;

    const result = await inventoryService.listProducts({ search, vatRate, page, limit });
    return NextResponse.json(
      createSuccessResponse(result.items, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'INVENTORY_FETCH_ERROR'),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedDto = CreateProductSchema.parse(body);
    const product = await inventoryService.createNewProduct(validatedDto);
    return NextResponse.json(createSuccessResponse(product), { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('Error de validación de datos', 'VALIDATION_ERROR', error.errors),
        { status: 422 }
      );
    }
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json(
      createErrorResponse(error.message, error.code || 'PRODUCT_CREATE_ERROR'),
      { status: statusCode }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedDto = UpdateProductSchema.parse(body);
    const updated = await inventoryService.updateProduct(validatedDto);
    return NextResponse.json(createSuccessResponse(updated));
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('Datos de producto inválidos', 'VALIDATION_ERROR', error.errors),
        { status: 422 }
      );
    }
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json(
      createErrorResponse(error.message, error.code || 'PRODUCT_UPDATE_ERROR'),
      { status: statusCode }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    // Si viene la actualización completa
    if (body.name !== undefined && body.salePrice !== undefined) {
      const validatedDto = UpdateProductSchema.parse(body);
      const updated = await inventoryService.updateProduct(validatedDto);
      return NextResponse.json(createSuccessResponse(updated));
    }

    // Actualización rápida de SKU
    const { id, sku } = UpdateSkuSchema.parse(body);
    const cleanSku = sku.trim();

    const existing = await prisma.product.findFirst({
      where: {
        sku: cleanSku,
        NOT: { id },
      },
    });

    if (existing) {
      return NextResponse.json(
        createErrorResponse(`El SKU "${cleanSku}" ya está registrado en el producto: ${existing.name}`, 'SKU_ALREADY_EXISTS'),
        { status: 409 }
      );
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { sku: cleanSku },
    });

    return NextResponse.json(createSuccessResponse(updated));
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('Datos inválidos', 'VALIDATION_ERROR', error.errors),
        { status: 422 }
      );
    }
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json(
      createErrorResponse(error.message, error.code || 'PRODUCT_UPDATE_ERROR'),
      { status: statusCode }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json(
        createErrorResponse('Se requiere el ID del producto para eliminar', 'MISSING_ID'),
        { status: 400 }
      );
    }

    const result = await inventoryService.deleteProduct(id);
    return NextResponse.json(createSuccessResponse(result));
  } catch (error: any) {
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json(
      createErrorResponse(error.message, error.code || 'PRODUCT_DELETE_ERROR'),
      { status: statusCode }
    );
  }
}

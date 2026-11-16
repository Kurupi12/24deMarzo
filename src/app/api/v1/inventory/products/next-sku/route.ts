import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '@/modules/inventory/services/inventory.service';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

export const dynamic = 'force-dynamic';

const inventoryService = new InventoryService();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name') || '';

    const result = await inventoryService.generateNextSku(name);
    return NextResponse.json(createSuccessResponse(result));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message || 'Error al generar SKU', 'SKU_GEN_ERROR'),
      { status: 500 }
    );
  }
}

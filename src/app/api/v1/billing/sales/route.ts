import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '@/modules/billing/services/billing.service';
import { CreateSaleSchema } from '@/modules/billing/validators/sale.schema';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const billingService = new BillingService();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    const result = await billingService.listSales({ search, page, limit });
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
      createErrorResponse(error.message, 'BILLING_FETCH_ERROR'),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedDto = CreateSaleSchema.parse(body);

    // En un flujo autenticado real, el userId se extrae de la sesión JWT/Cookie
    const userId = req.headers.get('x-user-id') || 'system-admin';

    const sale = await billingService.processSale({
      ...validatedDto,
      userId,
    });

    return NextResponse.json(createSuccessResponse(sale), { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('Error de validación en la venta', 'VALIDATION_ERROR', error.errors),
        { status: 422 }
      );
    }
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json(
      createErrorResponse(error.message, error.code || 'SALE_PROCESS_ERROR'),
      { status: statusCode }
    );
  }
}


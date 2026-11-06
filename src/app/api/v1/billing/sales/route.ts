import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '@/modules/billing/services/billing.service';
import { CreateSaleSchema } from '@/modules/billing/validators/sale.schema';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { AppError } from '@/shared/errors/app-error';
import { prisma } from '@/lib/prisma';

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

    // Obtener o asegurar un usuario de auditoría válido en Neon Postgres
    let user = await prisma.user.findFirst({ select: { id: true, name: true } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'admin@deposito4demarzo.com.py',
          name: 'Administrador 4 de Marzo',
          passwordHash: 'dummy',
          role: 'SUPER_ADMIN',
        },
      });
    }

    const requestedUserId = req.headers.get('x-user-id');
    let userId = user.id;
    if (requestedUserId) {
      const exists = await prisma.user.findUnique({ where: { id: requestedUserId }, select: { id: true } });
      if (exists) userId = exists.id;
    }

    // Vincular automáticamente al turno de caja actualmente abierto si no fue especificado
    let cashShiftId = validatedDto.cashShiftId || null;
    if (!cashShiftId) {
      const openShift = await prisma.cashShift.findFirst({
        where: { isOpen: true },
        orderBy: { openedAt: 'desc' },
        select: { id: true },
      });
      if (openShift) {
        cashShiftId = openShift.id;
      }
    }

    const sale = await billingService.processSale({
      ...validatedDto,
      cashShiftId,
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


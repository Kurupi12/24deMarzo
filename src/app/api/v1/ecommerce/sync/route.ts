import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BillingService } from '@/modules/billing/services/billing.service';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const billingService = new BillingService();

const EcommerceOrderSchema = z.object({
  customerName: z.string().min(2),
  customerRuc: z.string().min(5),
  customerEmail: z.string().email().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
  })).min(1),
});

export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = process.env.ERP_API_KEY_ECOMMERCE;
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json(createErrorResponse('Clave de API inválida', 'UNAUTHORIZED'), { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        sku: true,
        name: true,
        salePrice: true,
        unitOfMeasure: true,
        vatRate: true,
        stockItems: { select: { currentStock: true } },
      },
      take: 100,
    });

    const formatted = products.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      price: Number(p.salePrice),
      unitOfMeasure: p.unitOfMeasure,
      vatRate: p.vatRate,
      availableStock: Number(p.stockItems?.[0]?.currentStock || 0),
    }));

    return NextResponse.json(createSuccessResponse(formatted));
  } catch (error: any) {
    return NextResponse.json(createErrorResponse(error.message, 'ECOMMERCE_SYNC_ERROR'), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = process.env.ERP_API_KEY_ECOMMERCE;
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json(createErrorResponse('Clave de API inválida', 'UNAUTHORIZED'), { status: 401 });
    }

    const body = await req.json();
    const data = EcommerceOrderSchema.parse(body);

    const admin = await prisma.user.findFirst({ select: { id: true } });
    const userId = admin?.id || '';

    const sale = await billingService.processSale({
      userId,
      customerName: data.customerName,
      customerRuc: data.customerRuc,
      customerEmail: data.customerEmail,
      paymentCondition: 'CONTADO',
      paymentMethod: 'TRANSFERENCIA_BANCARIA',
      items: data.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        vatRate: 'IVA_10',
      })),
      issueInvoiceImmediately: true,
    });

    return NextResponse.json(createSuccessResponse({
      orderId: sale?.id,
      saleNumber: sale?.saleNumber,
      invoiceNumber: sale?.invoice?.invoiceNumber,
      cdc: sale?.invoice?.cdc,
      total: Number(sale?.grandTotal),
    }), { status: 201 });
  } catch (error: any) {
    return NextResponse.json(createErrorResponse(error.message, 'ECOMMERCE_ORDER_ERROR'), { status: 500 });
  }
}


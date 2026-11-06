import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query')?.trim() || '';

    let where: any = { isActive: true };

    if (query) {
      where = {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { ruc: { contains: query, mode: 'insensitive' } },
        ],
      };
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: [
        { name: 'asc' },
      ],
      take: 20,
    });

    return NextResponse.json(createSuccessResponse(customers));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'CUSTOMERS_FETCH_ERROR'),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ruc, name, address, phone, email } = body;

    if (!ruc || !name) {
      return NextResponse.json(
        createErrorResponse('RUC y Nombre o Razón Social son obligatorios', 'VALIDATION_ERROR'),
        { status: 422 }
      );
    }

    const customer = await prisma.customer.upsert({
      where: { ruc: ruc.trim() },
      update: {
        name: name.trim(),
        address: address?.trim() || undefined,
        phone: phone?.trim() || undefined,
        email: email?.trim() || undefined,
      },
      create: {
        ruc: ruc.trim(),
        name: name.trim(),
        address: address?.trim() || undefined,
        phone: phone?.trim() || undefined,
        email: email?.trim() || undefined,
      },
    });

    return NextResponse.json(createSuccessResponse(customer));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'CUSTOMER_CREATE_ERROR'),
      { status: 500 }
    );
  }
}

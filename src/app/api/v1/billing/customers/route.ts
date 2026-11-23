import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { resolveCustomerRuc } from '@/modules/billing/utils/customer-identity';

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
    const { ruc, name, address, googleMapsUrl, phone, email } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        createErrorResponse('El Nombre o Razón Social del cliente es obligatorio', 'VALIDATION_ERROR'),
        { status: 422 }
      );
    }

    const cleanName = String(name).trim();
    const resolvedRuc = await resolveCustomerRuc(prisma, {
      customerRuc: ruc,
      customerName: cleanName,
    });

    const customer = await prisma.customer.upsert({
      where: { ruc: resolvedRuc },
      update: {
        name: cleanName,
        address: address?.trim() || undefined,
        googleMapsUrl: googleMapsUrl?.trim() || undefined,
        phone: phone?.trim() || undefined,
        email: email?.trim() || undefined,
      },
      create: {
        ruc: resolvedRuc,
        name: cleanName,
        address: address?.trim() || undefined,
        googleMapsUrl: googleMapsUrl?.trim() || undefined,
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


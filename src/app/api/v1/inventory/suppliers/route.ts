import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query')?.trim() || '';
    const category = searchParams.get('category')?.trim() || '';

    let where: any = { isActive: true };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { ruc: { contains: query, mode: 'insensitive' } },
        { tradeName: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    });

    return NextResponse.json(createSuccessResponse(suppliers));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'SUPPLIERS_FETCH_ERROR'),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      ruc,
      name,
      tradeName,
      category,
      contactName,
      phone,
      email,
      address,
      city,
      creditDays,
      notes,
    } = body;

    if (!ruc || !name) {
      return NextResponse.json(
        createErrorResponse('RUC y Razón Social son obligatorios', 'VALIDATION_ERROR'),
        { status: 422 }
      );
    }

    let supplier;
    if (id) {
      supplier = await prisma.supplier.update({
        where: { id },
        data: {
          ruc: ruc.trim(),
          name: name.trim(),
          tradeName: tradeName?.trim() || null,
          category: category || 'GENERAL',
          contactName: contactName?.trim() || null,
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          address: address?.trim() || null,
          city: city?.trim() || null,
          creditDays: creditDays !== undefined ? Number(creditDays) : 0,
          notes: notes?.trim() || null,
        },
      });
    } else {
      supplier = await prisma.supplier.upsert({
        where: { ruc: ruc.trim() },
        update: {
          name: name.trim(),
          tradeName: tradeName?.trim() || null,
          category: category || 'GENERAL',
          contactName: contactName?.trim() || null,
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          address: address?.trim() || null,
          city: city?.trim() || null,
          creditDays: creditDays !== undefined ? Number(creditDays) : 0,
          notes: notes?.trim() || null,
          isActive: true,
        },
        create: {
          ruc: ruc.trim(),
          name: name.trim(),
          tradeName: tradeName?.trim() || null,
          category: category || 'GENERAL',
          contactName: contactName?.trim() || null,
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          address: address?.trim() || null,
          city: city?.trim() || null,
          creditDays: creditDays !== undefined ? Number(creditDays) : 0,
          notes: notes?.trim() || null,
        },
      });
    }

    return NextResponse.json(createSuccessResponse(supplier));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'SUPPLIER_SAVE_ERROR'),
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
        createErrorResponse('ID del proveedor es requerido', 'VALIDATION_ERROR'),
        { status: 422 }
      );
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json(createSuccessResponse(supplier));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'SUPPLIER_DELETE_ERROR'),
      { status: 500 }
    );
  }
}

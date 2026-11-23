import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { resolveCustomerRuc, syncCustomerMaster } from '@/modules/billing/utils/customer-identity';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerRuc = searchParams.get('customerRuc') || undefined;

    const where: any = { isActive: true };
    if (customerRuc) {
      where.customerRuc = customerRuc;
    }

    const projects = await prisma.customerProject.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { sales: true },
        },
      },
    });

    return NextResponse.json(createSuccessResponse(projects));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'PROJECTS_FETCH_ERROR'),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerRuc, customerName, name, address, contactName, contactPhone, googleMapsUrl } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        createErrorResponse('El nombre de la obra es obligatorio', 'VALIDATION_ERROR'),
        { status: 422 }
      );
    }

    const project = await prisma.$transaction(async (tx) => {
      const resolvedRuc = await resolveCustomerRuc(tx, {
        customerRuc,
        customerName,
      });

      if (customerName && String(customerName).trim() && resolvedRuc !== '44444401-7') {
        await syncCustomerMaster(tx, {
          ruc: resolvedRuc,
          name: String(customerName),
          address: address || null,
          googleMapsUrl: googleMapsUrl || null,
        });
      }

      return tx.customerProject.create({
        data: {
          customerRuc: resolvedRuc,
          name: String(name).trim(),
          address: address && String(address).trim() ? String(address).trim() : 'Dirección a confirmar',
          contactName: contactName ? String(contactName).trim() : null,
          contactPhone: contactPhone ? String(contactPhone).trim() : null,
          googleMapsUrl: googleMapsUrl ? String(googleMapsUrl).trim() : null,
          isActive: true,
        },
      });
    });

    return NextResponse.json(createSuccessResponse(project), { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'PROJECT_CREATE_ERROR'),
      { status: 500 }
    );
  }
}


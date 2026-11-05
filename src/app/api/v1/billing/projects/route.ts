import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

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
    const { customerRuc, name, address, contactName, contactPhone } = body;

    if (!customerRuc || !name || !address) {
      return NextResponse.json(
        createErrorResponse('RUC del cliente, nombre y dirección de obra son obligatorios', 'VALIDATION_ERROR'),
        { status: 422 }
      );
    }

    const project = await prisma.customerProject.create({
      data: {
        customerRuc: customerRuc.trim(),
        name: name.trim(),
        address: address.trim(),
        contactName: contactName ? contactName.trim() : null,
        contactPhone: contactPhone ? contactPhone.trim() : null,
        isActive: true,
      },
    });

    return NextResponse.json(createSuccessResponse(project), { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'PROJECT_CREATE_ERROR'),
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const expense = await prisma.vehicleExpense.findUnique({
      where: { id },
      include: {
        vehicle: true,
      },
    });

    if (!expense) {
      return NextResponse.json(createErrorResponse('Registro de gasto no encontrado', 'NOT_FOUND'), { status: 404 });
    }

    return NextResponse.json(createSuccessResponse(expense));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message || 'Error al obtener registro de gasto', 'EXPENSE_GET_ERROR'),
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const existing = await prisma.vehicleExpense.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(createErrorResponse('Registro no encontrado o ya eliminado', 'NOT_FOUND'), { status: 404 });
    }

    await prisma.vehicleExpense.delete({
      where: { id },
    });

    return NextResponse.json(createSuccessResponse({ success: true, id }));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message || 'Error al eliminar registro de gasto', 'EXPENSE_DELETE_ERROR'),
      { status: 500 }
    );
  }
}


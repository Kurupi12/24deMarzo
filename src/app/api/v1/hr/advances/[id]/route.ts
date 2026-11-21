import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        createErrorResponse('Sesión requerida para eliminar adelantos.', 'UNAUTHORIZED'),
        { status: 401 }
      );
    }

    const advanceId = params.id;
    const advance = await prisma.advancePayment.findUnique({
      where: { id: advanceId },
    });

    if (!advance) {
      return NextResponse.json(
        createErrorResponse('Adelanto / vale no encontrado', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    await prisma.advancePayment.delete({
      where: { id: advanceId },
    });

    return NextResponse.json(
      createSuccessResponse({
        deleted: true,
        id: advanceId,
        message: 'Adelanto eliminado correctamente.',
      })
    );
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message || 'Error al eliminar adelanto', 'ADVANCE_DELETE_ERROR'),
      { status: 500 }
    );
  }
}

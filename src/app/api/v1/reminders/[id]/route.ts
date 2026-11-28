import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

export const dynamic = 'force-dynamic';

function isAdminRole(role?: string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !isAdminRole(sessionUser.role)) {
      return NextResponse.json(
        createErrorResponse('Solo la Dirección puede editar u ocultar recordatorios', 'FORBIDDEN'),
        { status: 403 }
      );
    }

    const { id } = params;
    const existing = await prisma.localReminder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        createErrorResponse('Recordatorio no encontrado', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const dataToUpdate: {
      text?: string;
      targetUserId?: string | null;
      isActive?: boolean;
    } = {};

    if (typeof body.text === 'string') {
      const cleanText = body.text.trim();
      if (!cleanText) {
        return NextResponse.json(
          createErrorResponse('El texto del recordatorio no puede quedar vacío', 'VALIDATION_ERROR'),
          { status: 400 }
        );
      }
      if (cleanText.length > 200) {
        return NextResponse.json(
          createErrorResponse('El recordatorio debe ser corto (máximo 200 caracteres)', 'VALIDATION_ERROR'),
          { status: 400 }
        );
      }
      dataToUpdate.text = cleanText;
    }

    if (body.targetUserId !== undefined) {
      const rawTargetId = typeof body.targetUserId === 'string' ? body.targetUserId.trim() : '';
      if (!rawTargetId || rawTargetId === 'ALL') {
        dataToUpdate.targetUserId = null;
      } else {
        const targetUser = await prisma.user.findUnique({
          where: { id: rawTargetId },
          select: { id: true, isActive: true },
        });
        if (!targetUser || !targetUser.isActive) {
          return NextResponse.json(
            createErrorResponse('Usuario destinatario inválido o inactivo', 'NOT_FOUND'),
            { status: 404 }
          );
        }
        dataToUpdate.targetUserId = targetUser.id;
      }
    }

    if (typeof body.isActive === 'boolean') {
      dataToUpdate.isActive = body.isActive;
    }

    const updated = await prisma.localReminder.update({
      where: { id },
      data: dataToUpdate,
      include: {
        targetUser: {
          select: { id: true, name: true, role: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(createSuccessResponse(updated));
  } catch (error: any) {
    console.error('Error al actualizar recordatorio:', error);
    return NextResponse.json(
      createErrorResponse(error.message || 'Error al actualizar recordatorio', 'REMINDER_UPDATE_ERROR'),
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !isAdminRole(sessionUser.role)) {
      return NextResponse.json(
        createErrorResponse('Solo la Dirección puede eliminar recordatorios', 'FORBIDDEN'),
        { status: 403 }
      );
    }

    const { id } = params;
    const existing = await prisma.localReminder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        createErrorResponse('Recordatorio no encontrado', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    await prisma.localReminder.delete({ where: { id } });

    return NextResponse.json(createSuccessResponse({ id }));
  } catch (error: any) {
    console.error('Error al eliminar recordatorio:', error);
    return NextResponse.json(
      createErrorResponse(error.message || 'Error al eliminar recordatorio', 'REMINDER_DELETE_ERROR'),
      { status: 500 }
    );
  }
}

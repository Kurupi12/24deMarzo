import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

export const dynamic = 'force-dynamic';

function isAdminRole(role?: string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        createErrorResponse('Sesión requerida', 'UNAUTHORIZED'),
        { status: 401 }
      );
    }

    const isAdmin = isAdminRole(sessionUser.role);

    const reminders = await prisma.localReminder.findMany({
      where: isAdmin
        ? undefined
        : {
            isActive: true,
            OR: [
              { targetUserId: sessionUser.id },
              { targetUserId: null },
            ],
          },
      include: {
        targetUser: {
          select: { id: true, name: true, role: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(
      createSuccessResponse({
        isAdmin,
        reminders,
      })
    );
  } catch (error: any) {
    console.error('Error al obtener recordatorios:', error);
    return NextResponse.json(
      createErrorResponse(error.message || 'Error al obtener recordatorios', 'REMINDERS_FETCH_ERROR'),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !isAdminRole(sessionUser.role)) {
      return NextResponse.json(
        createErrorResponse('Solo la Dirección puede crear o modificar recordatorios', 'FORBIDDEN'),
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawText = typeof body.text === 'string' ? body.text.trim() : '';

    if (!rawText) {
      return NextResponse.json(
        createErrorResponse('El texto del recordatorio es obligatorio', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    if (rawText.length > 200) {
      return NextResponse.json(
        createErrorResponse('El recordatorio debe ser corto (máximo 200 caracteres)', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const rawTargetId = typeof body.targetUserId === 'string' ? body.targetUserId.trim() : '';
    let resolvedTargetUserId: string | null = null;

    if (rawTargetId && rawTargetId !== 'ALL') {
      const targetUser = await prisma.user.findUnique({
        where: { id: rawTargetId },
        select: { id: true, isActive: true },
      });
      if (!targetUser || !targetUser.isActive) {
        return NextResponse.json(
          createErrorResponse('El usuario destinatario seleccionado no existe o está inactivo', 'NOT_FOUND'),
          { status: 404 }
        );
      }
      resolvedTargetUserId = targetUser.id;
    }

    const created = await prisma.localReminder.create({
      data: {
        text: rawText,
        targetUserId: resolvedTargetUserId,
        createdById: sessionUser.id,
        isActive: body.isActive !== false,
      },
      include: {
        targetUser: {
          select: { id: true, name: true, role: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(createSuccessResponse(created), { status: 201 });
  } catch (error: any) {
    console.error('Error al crear recordatorio:', error);
    return NextResponse.json(
      createErrorResponse(error.message || 'Error al crear recordatorio', 'REMINDER_CREATE_ERROR'),
      { status: 500 }
    );
  }
}

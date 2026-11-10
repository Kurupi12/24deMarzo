import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePin } from '@/lib/auth/password';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetUserId, pin } = body;

    if (!targetUserId || !pin) {
      return NextResponse.json(
        { success: false, error: 'Debe seleccionar un operador e ingresar su PIN de 4 dígitos' },
        { status: 400 }
      );
    }

    const cleanPin = String(pin).trim();

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser || !targetUser.isActive) {
      return NextResponse.json(
        { success: false, error: 'Operador no encontrado o inactivo' },
        { status: 404 }
      );
    }

    if (!targetUser.pinCode) {
      return NextResponse.json(
        { success: false, error: 'Este operador no tiene un PIN configurado. Inicie sesión con contraseña.' },
        { status: 400 }
      );
    }

    const isPinValid = comparePin(cleanPin, targetUser.pinCode);
    if (!isPinValid) {
      return NextResponse.json(
        { success: false, error: 'PIN incorrecto. Intente nuevamente.' },
        { status: 401 }
      );
    }

    const sessionUser = {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
      isPinSwitched: true,
    };

    const token = await createSessionToken(sessionUser);

    const res = NextResponse.json({
      success: true,
      data: { user: sessionUser },
      message: `Cajero cambiado a: ${targetUser.name}`,
    });

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error: any) {
    console.error('Error en POST /api/v1/auth/switch-operator:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al cambiar de operador' },
      { status: 500 }
    );
  }
}

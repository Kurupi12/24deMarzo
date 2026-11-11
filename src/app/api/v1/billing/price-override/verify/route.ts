import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session';
import { comparePin } from '@/lib/auth/password';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const body = await req.json();
    const { code, productName } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Debe ingresar el código de autorización' },
        { status: 400 }
      );
    }

    const cleanCode = String(code).trim().replace(/\D/g, '');

    // Opción 1: Validar si ingresó el PIN maestro del Super Admin directamente (ej. si Osvaldo está presente)
    const adminUser = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN', isActive: true },
    });

    if (adminUser && adminUser.pinCode && comparePin(cleanCode, adminUser.pinCode)) {
      return NextResponse.json({
        success: true,
        data: { authorizedBy: adminUser.name, type: 'SUPERVISOR_PIN' },
        message: 'Precio desbloqueado mediante PIN de Supervisión Directa.',
      });
    }

    // Opción 2: Validar contra la tabla de Tokens OTP de único uso
    const token = await prisma.priceOverrideToken.findUnique({
      where: { code: cleanCode },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Código de autorización inválido o inexistente.' },
        { status: 400 }
      );
    }

    if (token.isUsed) {
      return NextResponse.json(
        { success: false, error: 'Este código ya fue utilizado anteriormente (es de único uso).' },
        { status: 400 }
      );
    }

    if (new Date() > new Date(token.expiresAt)) {
      return NextResponse.json(
        { success: false, error: 'Este código ha expirado (validez máxima de 15 minutos).' },
        { status: 400 }
      );
    }

    // Quemar el token (marcarlo como usado)
    await prisma.priceOverrideToken.update({
      where: { id: token.id },
      data: {
        isUsed: true,
        usedAt: new Date(),
        usedById: sessionUser?.id || null,
        notes: productName ? `Desbloqueo de precio para: ${productName}` : token.notes,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        authorizedBy: token.createdBy.name,
        type: 'OTP_TOKEN',
      },
      message: `Precio desbloqueado con autorización de ${token.createdBy.name}.`,
    });
  } catch (error: any) {
    console.error('Error al verificar token de precio:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al validar código' },
      { status: 500 }
    );
  }
}


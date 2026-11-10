import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();

    // Solo SUPER_ADMIN o ADMIN (Osvaldo) puede emitir tokens de autorización de precio
    if (!sessionUser || (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.role !== 'ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Solo la Dirección / Super Admin puede generar códigos de autorización' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { notes } = body;

    // Generar código numérico aleatorio de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Válido por 15 minutos
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const token = await prisma.priceOverrideToken.create({
      data: {
        code,
        createdById: sessionUser.id,
        expiresAt,
        notes: notes ? String(notes).trim() : null,
      },
      select: {
        id: true,
        code: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: token,
      message: `Código de autorización generado: ${code}`,
    });
  } catch (error: any) {
    console.error('Error al generar token de precio:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al generar código' },
      { status: 500 }
    );
  }
}

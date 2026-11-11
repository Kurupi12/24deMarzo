import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessionUser = await getSessionUser();

    // Obtener lista de operadores activos para el conmutador de mostrador
    const activeOperators = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        pinCode: true,
      },
      orderBy: { name: 'asc' },
    });

    const availableUsers = activeOperators.map((op) => ({
      id: op.id,
      name: op.name,
      email: op.email,
      role: op.role,
      hasPin: !!op.pinCode,
    }));

    // Si hay usuario en sesión, verificar que siga activo en BD
    if (sessionUser) {
      const dbUser = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: { id: true, name: true, email: true, role: true, isActive: true },
      });

      if (dbUser && dbUser.isActive) {
        return NextResponse.json({
          success: true,
          data: {
            user: {
              id: dbUser.id,
              name: dbUser.name,
              email: dbUser.email,
              role: dbUser.role,
            },
            availableUsers,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        user: null,
        availableUsers,
      },
    });
  } catch (error: any) {
    console.error('Error en GET /api/v1/auth/me:', error);
    return NextResponse.json(
      { success: false, error: 'Error al verificar sesión' },
      { status: 500 }
    );
  }
}


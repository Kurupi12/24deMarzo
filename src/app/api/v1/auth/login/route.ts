import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, hashPassword } from '@/lib/auth/password';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { SystemRole } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Buscar usuario en base de datos
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { email: { startsWith: cleanEmail + '@' } },
        ],
      },
    });

    // Si la base de datos no tiene al admin o está con hash provisional
    if (!user && (cleanEmail === 'admin@deposito4demarzo.com.py' || cleanEmail === 'admin')) {
      const defaultHash = await hashPassword('Admin1234!');
      user = await prisma.user.upsert({
        where: { email: 'admin@deposito4demarzo.com.py' },
        update: {},
        create: {
          email: 'admin@deposito4demarzo.com.py',
          name: 'Osvaldo Molinas (Admin)',
          passwordHash: defaultHash,
          pinCode: '1126',
          role: SystemRole.SUPER_ADMIN,
          isActive: true,
        },
      });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas. Verifique su correo o usuario.' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Este usuario está inactivo. Contacte al administrador.' },
        { status: 403 }
      );
    }

    // Verificar contraseña
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Contraseña incorrecta.' },
        { status: 401 }
      );
    }

    // Actualizar último inicio de sesión
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = await createSessionToken(sessionUser);

    const res = NextResponse.json({
      success: true,
      data: { user: sessionUser },
      message: `¡Bienvenido, ${user.name}!`,
    });

    // Configurar cookie de sesión HTTP-only
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });

    return res;
  } catch (error: any) {
    console.error('Error en POST /api/v1/auth/login:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al iniciar sesión' },
      { status: 500 }
    );
  }
}

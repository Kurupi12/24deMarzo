import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { getSessionUser } from '@/lib/auth/session';
import { SystemRole } from '@prisma/client';

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    // Permitir consulta si es admin o si está autenticado
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        pinCode: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            sales: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const formattedUsers = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      hasPin: !!u.pinCode,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      salesCount: u._count.sales,
    }));

    return NextResponse.json({
      success: true,
      data: formattedUsers,
    });
  } catch (error: any) {
    console.error('Error en GET /api/v1/users:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (sessionUser && sessionUser.role !== 'SUPER_ADMIN' && sessionUser.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado. Se requieren permisos de administrador.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password, role, pinCode } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'Nombre, email, contraseña y rol son requeridos' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un usuario con este correo electrónico' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const cleanPin = pinCode ? String(pinCode).trim() : null;

    const newUser = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: cleanEmail,
        passwordHash: hashedPassword,
        role: role as SystemRole,
        pinCode: cleanPin,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        pinCode: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...newUser,
        hasPin: !!newUser.pinCode,
      },
      message: `Usuario ${newUser.name} creado exitosamente`,
    });
  } catch (error: any) {
    console.error('Error en POST /api/v1/users:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear usuario' },
      { status: 500 }
    );
  }
}


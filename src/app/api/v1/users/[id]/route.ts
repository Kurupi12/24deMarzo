import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { getSessionUser } from '@/lib/auth/session';
import { SystemRole } from '@prisma/client';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (sessionUser && sessionUser.role !== 'SUPER_ADMIN' && sessionUser.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado' },
        { status: 403 }
      );
    }

    const userId = params.id;
    const body = await req.json();
    const { name, email, role, pinCode, password, isActive } = body;

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = String(name).trim();
    if (email !== undefined) dataToUpdate.email = String(email).trim().toLowerCase();
    if (role !== undefined) dataToUpdate.role = role as SystemRole;
    if (pinCode !== undefined) dataToUpdate.pinCode = pinCode ? String(pinCode).trim() : null;
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);

    if (password && String(password).trim().length > 0) {
      dataToUpdate.passwordHash = await hashPassword(String(password).trim());
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        pinCode: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updatedUser,
        hasPin: !!updatedUser.pinCode,
      },
      message: 'Usuario actualizado correctamente',
    });
  } catch (error: any) {
    console.error('Error en PATCH /api/v1/users/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (sessionUser && sessionUser.role !== 'SUPER_ADMIN' && sessionUser.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado' },
        { status: 403 }
      );
    }

    const userId = params.id;

    // Desactivar en lugar de borrar si tiene historial operativo
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: `Usuario ${user.name} desactivado del sistema`,
    });
  } catch (error: any) {
    console.error('Error en DELETE /api/v1/users/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al desactivar usuario' },
      { status: 500 }
    );
  }
}


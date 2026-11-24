import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { verifyAndConsumeSupervisorOtp } from '@/lib/auth/otp-verifier';
import { AppError } from '@/shared/errors/app-error';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const body = await req.json();
    const { code, productName } = body;

    const auth = await verifyAndConsumeSupervisorOtp({
      code,
      usedById: sessionUser?.id || null,
      usageNote: productName ? `Desbloqueo de precio para: ${productName}` : undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        authorizedBy: auth.authorizedBy,
        type: auth.type,
      },
      message:
        auth.type === 'SUPERVISOR_PIN'
          ? 'Precio desbloqueado mediante PIN de Supervisión Directa.'
          : `Precio desbloqueado con autorización de ${auth.authorizedBy}.`,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error('Error al verificar token de precio:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al validar código' },
      { status: 500 }
    );
  }
}


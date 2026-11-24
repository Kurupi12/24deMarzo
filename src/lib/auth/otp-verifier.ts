import { prisma } from '@/lib/prisma';
import { comparePin } from '@/lib/auth/password';
import { AppError } from '@/shared/errors/app-error';

export interface SupervisorOtpResult {
  authorizedBy: string;
  type: 'OTP_TOKEN' | 'SUPERVISOR_PIN';
  cleanCode: string;
}

/**
 * Valida y consume un código de autorización de único uso (OTP de 6 dígitos emitido por Osvaldo/Admin)
 * o verifica el PIN maestro de supervisión directa si está presente.
 */
export async function verifyAndConsumeSupervisorOtp(params: {
  code: string;
  usedById?: string | null;
  usageNote?: string | null;
}): Promise<SupervisorOtpResult> {
  const cleanCode = String(params.code || '').trim().replace(/\D/g, '');
  if (!cleanCode) {
    throw new AppError('Debe ingresar el código de autorización.', 400, 'OTP_REQUIRED');
  }

  // 1. Verificar si corresponde al PIN maestro del Super Admin presente
  const adminUser = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN', isActive: true },
  });

  if (adminUser && adminUser.pinCode && comparePin(cleanCode, adminUser.pinCode)) {
    return {
      authorizedBy: adminUser.name,
      type: 'SUPERVISOR_PIN',
      cleanCode,
    };
  }

  // 2. Validar y quemar token OTP de único uso
  const token = await prisma.priceOverrideToken.findUnique({
    where: { code: cleanCode },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!token) {
    throw new AppError('Código de autorización inválido o inexistente.', 400, 'OTP_INVALID');
  }

  if (token.isUsed) {
    throw new AppError('Este código ya fue utilizado anteriormente (es de único uso).', 400, 'OTP_USED');
  }

  if (new Date() > new Date(token.expiresAt)) {
    throw new AppError('Este código ha expirado (validez máxima de 15 minutos).', 400, 'OTP_EXPIRED');
  }

  await prisma.priceOverrideToken.update({
    where: { id: token.id },
    data: {
      isUsed: true,
      usedAt: new Date(),
      usedById: params.usedById || null,
      notes: params.usageNote || token.notes,
    },
  });

  return {
    authorizedBy: token.createdBy.name,
    type: 'OTP_TOKEN',
    cleanCode,
  };
}

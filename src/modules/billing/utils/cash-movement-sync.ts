import { CashMovementType, Prisma, PrismaClient } from '@prisma/client';
import { AppError } from '@/shared/errors/app-error';

type DbClient = PrismaClient | Prisma.TransactionClient;

export interface OptionalCashExpenseInput {
  type: CashMovementType;
  category: string;
  amount: number;
  description: string;
  beneficiary?: string | null;
  receiptNo?: string | null;
  expectedUserId?: string | null;
  enforceShiftOwner?: boolean;
}

/**
 * Obtiene el turno de caja abierto actual o lanza un error claro si la caja está cerrada.
 */
export async function requireOpenCashShift(db: DbClient) {
  const openShift = await db.cashShift.findFirst({
    where: { isOpen: true },
    orderBy: { openedAt: 'desc' },
    select: { id: true, openedAt: true },
  });

  if (!openShift) {
    throw new AppError(
      'La caja del día está cerrada. Abra el turno en "Control de Cajas" para poder vender, facturar o cobrar. (Los Presupuestos sí se pueden emitir con caja cerrada).',
      400,
      'CASH_SHIFT_CLOSED'
    );
  }

  return openShift;
}

/**
 * Registra una salida de efectivo en el turno de caja actualmente abierto (CAJA-01).
 * Si no existe un turno abierto, rechaza la operación para evitar desfasajes silenciosos.
 */
export async function recordCashOutflowOnOpenShift(
  tx: Prisma.TransactionClient,
  input: OptionalCashExpenseInput
) {
  if (!input.amount || input.amount <= 0) return null;

  const openShift = await tx.cashShift.findFirst({
    where: {
      isOpen: true,
      cashRegister: { code: 'CAJA-01' },
    },
    orderBy: { openedAt: 'desc' },
    select: { id: true, openedByUserId: true },
  });

  if (!openShift) {
    throw new AppError(
      'No hay un turno de caja abierto en este momento para descontar efectivo. Abra la caja o seleccione "Sin descontar de caja".',
      400,
      'NO_OPEN_SHIFT'
    );
  }

  if (input.enforceShiftOwner) {
    if (!input.expectedUserId) {
      throw new AppError(
        'No se pudo identificar tu usuario activo para descontar efectivo de la caja.',
        401,
        'UNAUTHORIZED_CASH_DEDUCTION'
      );
    }

    if (openShift.openedByUserId !== input.expectedUserId) {
      const owner = await tx.user.findUnique({
        where: { id: openShift.openedByUserId },
        select: { name: true },
      });
      throw new AppError(
        `La caja actualmente abierta pertenece a ${owner?.name || 'otro usuario'}. Solo quien abrió esa caja puede descontar efectivo de ella; cargá tu gasto como "Fuera de Caja / Pago propio".`,
        403,
        'SHIFT_OWNER_MISMATCH'
      );
    }
  }

  return tx.cashMovement.create({
    data: {
      cashShiftId: openShift.id,
      type: input.type,
      category: input.category,
      amount: input.amount,
      description: input.description,
      beneficiary: input.beneficiary?.trim() || null,
      receiptNo: input.receiptNo?.trim() || null,
    },
  });
}

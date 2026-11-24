import { CashMovementType, Prisma } from '@prisma/client';
import { AppError } from '@/shared/errors/app-error';

export interface OptionalCashExpenseInput {
  type: CashMovementType;
  category: string;
  amount: number;
  description: string;
  beneficiary?: string | null;
  receiptNo?: string | null;
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
    select: { id: true },
  });

  if (!openShift) {
    throw new AppError(
      'No hay un turno de caja abierto en este momento para descontar efectivo. Abra la caja o seleccione "Sin descontar de caja".',
      400,
      'NO_OPEN_SHIFT'
    );
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

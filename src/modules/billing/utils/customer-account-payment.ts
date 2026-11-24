import { PaymentMethod, Prisma, PrismaClient } from '@prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

export interface CreateCustomerPaymentInput {
  customerRuc: string;
  customerName: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  paymentReference?: string | null;
  notes?: string | null;
  userId: string;
  cashShiftId?: string | null;
}

/**
 * Registra un cobro / cancelación de cuenta corriente (libreta) generando el recibo REC-XXXXXX correlativo.
 */
export async function createCustomerAccountPayment(
  db: DbClient,
  input: CreateCustomerPaymentInput
) {
  const lastPayment = await db.customerPayment.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { receiptNumber: true },
  });

  let nextNum = 1;
  if (lastPayment?.receiptNumber) {
    const match = lastPayment.receiptNumber.match(/\d+/);
    if (match) nextNum = parseInt(match[0], 10) + 1;
  }
  const receiptNumber = `REC-${nextNum.toString().padStart(6, '0')}`;

  return db.customerPayment.create({
    data: {
      receiptNumber,
      customerRuc: input.customerRuc.trim(),
      customerName: input.customerName.trim(),
      amount: Number(input.amount),
      paymentMethod: input.paymentMethod || 'EFECTIVO',
      paymentReference: input.paymentReference?.trim() || null,
      cashShiftId: input.cashShiftId ?? null,
      notes: input.notes?.trim() || null,
      userId: input.userId,
    },
  });
}

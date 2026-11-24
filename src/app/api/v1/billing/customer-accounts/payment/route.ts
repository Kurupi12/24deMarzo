import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { getSessionUser } from '@/lib/auth/session';
import { createCustomerAccountPayment } from '@/modules/billing/utils/customer-account-payment';
import { requireOpenCashShift } from '@/modules/billing/utils/cash-movement-sync';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerRuc, customerName, amount, paymentMethod, paymentReference, notes } = body;

    if (!customerRuc || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        createErrorResponse('RUC de cliente y monto válido son requeridos', 'INVALID_INPUT'),
        { status: 400 }
      );
    }

    const sessionUser = await getSessionUser();
    let userId = sessionUser?.id;
    if (!userId) {
      let user = await prisma.user.findFirst({ select: { id: true, name: true } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'admin@deposito4demarzo.com.py',
            name: 'Administrador 4 de Marzo',
            passwordHash: 'dummy',
            role: 'SUPER_ADMIN',
          },
        });
      }
      userId = user.id;
    }

    // Exigir turno de caja abierto para registrar cobros en libreta
    const openShift = await requireOpenCashShift(prisma);

    const payment = await createCustomerAccountPayment(prisma, {
      customerRuc,
      customerName: customerName || 'Cliente',
      amount: Number(amount),
      paymentMethod: paymentMethod || 'EFECTIVO',
      paymentReference,
      cashShiftId: openShift.id,
      notes,
      userId,
    });

    return NextResponse.json(createSuccessResponse(payment), { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        createErrorResponse(error.message, error.code || 'PAYMENT_PROCESS_ERROR'),
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      createErrorResponse(error.message, 'PAYMENT_PROCESS_ERROR'),
      { status: 500 }
    );
  }
}


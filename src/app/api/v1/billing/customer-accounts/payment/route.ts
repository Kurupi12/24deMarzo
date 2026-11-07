import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

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

    // Buscar turno de caja abierto para registrar el ingreso de dinero en el arqueo diario
    const openShift = await prisma.cashShift.findFirst({
      where: { isOpen: true },
      orderBy: { openedAt: 'desc' },
      select: { id: true },
    });

    // Generar correlativo de recibo de dinero
    const lastPayment = await prisma.customerPayment.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { receiptNumber: true },
    });

    let nextNum = 1;
    if (lastPayment?.receiptNumber) {
      const match = lastPayment.receiptNumber.match(/\d+/);
      if (match) nextNum = parseInt(match[0], 10) + 1;
    }
    const receiptNumber = `REC-${nextNum.toString().padStart(6, '0')}`;

    const payment = await prisma.customerPayment.create({
      data: {
        receiptNumber,
        customerRuc: customerRuc.trim(),
        customerName: customerName.trim(),
        amount: Number(amount),
        paymentMethod: paymentMethod || 'EFECTIVO',
        paymentReference: paymentReference?.trim() || null,
        cashShiftId: openShift?.id || null,
        notes: notes?.trim() || null,
        userId: user.id,
      },
    });

    return NextResponse.json(createSuccessResponse(payment), { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'PAYMENT_PROCESS_ERROR'),
      { status: 500 }
    );
  }
}

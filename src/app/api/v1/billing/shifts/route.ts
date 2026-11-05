import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Buscar caja principal o crearla si no existe
    let register = await prisma.cashRegister.findFirst({
      where: { code: 'CAJA-01' },
      include: {
        shifts: {
          where: { isOpen: true },
          include: { sales: true },
        },
      },
    });

    if (!register) {
      register = await prisma.cashRegister.create({
        data: { code: 'CAJA-01', name: 'Caja Mostrador Central' },
        include: { shifts: { where: { isOpen: true }, include: { sales: true } } },
      });
    }

    const currentShift = register.shifts[0] || null;
    return NextResponse.json(createSuccessResponse({ register, currentShift }));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'CASH_SHIFT_ERROR'),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, openingBalance, closingBalance, shiftId } = body;

    const admin = await prisma.user.findFirst({ select: { id: true } });
    const userId = req.headers.get('x-user-id') || admin?.id || '';

    let register = await prisma.cashRegister.findFirst({ where: { code: 'CAJA-01' } });
    if (!register) {
      register = await prisma.cashRegister.create({
        data: { code: 'CAJA-01', name: 'Caja Mostrador Central' },
      });
    }

    if (action === 'OPEN') {
      const openShift = await prisma.cashShift.create({
        data: {
          cashRegisterId: register.id,
          openedByUserId: userId,
          openingBalance: Number(openingBalance) || 0,
          isOpen: true,
        },
      });
      return NextResponse.json(createSuccessResponse(openShift), { status: 201 });
    }

    if (action === 'CLOSE' && shiftId) {
      const shift = await prisma.cashShift.findUnique({
        where: { id: shiftId },
        include: { sales: true },
      });

      if (!shift) {
        return NextResponse.json(createErrorResponse('Turno no encontrado', 'NOT_FOUND'), { status: 404 });
      }

      // Calcular ventas en efectivo realizadas en este turno
      const cashSalesTotal = shift.sales
        .filter((s) => s.paymentMethod === 'EFECTIVO' && s.status === 'COMPLETED')
        .reduce((sum, s) => sum + Number(s.grandTotal), 0);

      const expected = Number(shift.openingBalance) + cashSalesTotal;
      const actual = Number(closingBalance) || 0;
      const difference = actual - expected;

      const closedShift = await prisma.cashShift.update({
        where: { id: shiftId },
        data: {
          closedByUserId: userId,
          closedAt: new Date(),
          closingBalance: actual,
          expectedBalance: expected,
          difference,
          isOpen: false,
        },
      });

      return NextResponse.json(createSuccessResponse(closedShift));
    }

    return NextResponse.json(createErrorResponse('Acción inválida', 'BAD_REQUEST'), { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'SHIFT_OPERATION_ERROR'),
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let register = await prisma.cashRegister.findFirst({
      where: { code: 'CAJA-01' },
    });

    if (!register) {
      register = await prisma.cashRegister.create({
        data: { code: 'CAJA-01', name: 'Caja Mostrador Central' },
      });
    }

    // 1. Buscar turno actualmente abierto
    const currentShift = await prisma.cashShift.findFirst({
      where: { cashRegisterId: register.id, isOpen: true },
      include: {
        sales: {
          select: { id: true, saleNumber: true, paymentMethod: true, paymentCondition: true, grandTotal: true, createdAt: true, status: true },
        },
        movements: {
          orderBy: { createdAt: 'desc' },
        },
        customerPayments: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { openedAt: 'desc' },
    });

    // 2. Buscar último turno cerrado para la comprobación inicial a ciegas (Blind Count)
    const lastClosedShift = await prisma.cashShift.findFirst({
      where: { cashRegisterId: register.id, isOpen: false },
      orderBy: { closedAt: 'desc' },
      select: {
        id: true,
        closedAt: true,
        closingBalance: true,
        expectedBalance: true,
        difference: true,
        totalSafeDeposits: true,
      },
    });

    // 3. Historial de turnos recientes
    const history = await prisma.cashShift.findMany({
      where: { cashRegisterId: register.id },
      take: 15,
      orderBy: { openedAt: 'desc' },
      include: {
        movements: true,
        _count: { select: { sales: true } },
      },
    });

    // 4. Calcular métricas en vivo si hay turno abierto
    let metrics = null;
    if (currentShift) {
      // Solo ventas CONTADO en efectivo ingresan dinero a caja (A_CUENTA y CREDITO no ingresan efectivo hoy)
      const cashSales = currentShift.sales
        .filter((s) => s.paymentMethod === 'EFECTIVO' && s.paymentCondition === 'CONTADO' && s.status === 'COMPLETED')
        .reduce((sum, s) => sum + Number(s.grandTotal), 0);

      // Cobros de cuentas corrientes o pagos a cuenta de clientes cobrados en efectivo
      const customerPaymentsCash = (currentShift.customerPayments || [])
        .filter((cp) => cp.paymentMethod === 'EFECTIVO')
        .reduce((sum, cp) => sum + Number(cp.amount), 0);

      const incomes = currentShift.movements
        .filter((m) => m.type === 'INCOME_CHANGE')
        .reduce((sum, m) => sum + Number(m.amount), 0);

      const expenses = currentShift.movements
        .filter((m) => m.type === 'EXPENSE_OPERATION' || m.type === 'EXPENSE_ADVANCE')
        .reduce((sum, m) => sum + Number(m.amount), 0);

      const safeDeposits = currentShift.movements
        .filter((m) => m.type === 'SAFE_DEPOSIT')
        .reduce((sum, m) => sum + Number(m.amount), 0);

      const opening = Number(currentShift.openingBalance);
      const expectedCashInDrawer = opening + cashSales + customerPaymentsCash + incomes - expenses - safeDeposits;

      metrics = {
        openingBalance: opening,
        cashSales,
        customerPaymentsCash,
        incomes,
        expenses,
        safeDeposits,
        expectedCashInDrawer,
        totalSafeAndDrawer: expectedCashInDrawer + safeDeposits,
      };
    }

    return NextResponse.json(
      createSuccessResponse({
        register,
        currentShift,
        lastClosedShift,
        metrics,
        history,
      })
    );
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
    const { action, openingBalance, closingBalance, shiftId, notes, openingNotes, breakdown } = body;

    const admin = await prisma.user.findFirst({ select: { id: true, name: true } });
    const userId = req.headers.get('x-user-id') || admin?.id || 'cajera-central';

    let register = await prisma.cashRegister.findFirst({ where: { code: 'CAJA-01' } });
    if (!register) {
      register = await prisma.cashRegister.create({
        data: { code: 'CAJA-01', name: 'Caja Mostrador Central' },
      });
    }

    // ACCIÓN 1: APERTURA DE CAJA CON COMPROBACIÓN A CIEGAS
    if (action === 'OPEN') {
      // Regla: No permitir más de un turno abierto a la vez
      const existingOpen = await prisma.cashShift.findFirst({
        where: { cashRegisterId: register.id, isOpen: true },
      });

      if (existingOpen) {
        return NextResponse.json(
          createErrorResponse('Ya existe un turno de caja abierto actualmente en esta terminal. Debe cerrar el turno previo antes de abrir uno nuevo.', 'SHIFT_ALREADY_OPEN'),
          { status: 400 }
        );
      }

      // Regla: Buscar el saldo con el que cerró el turno anterior
      const lastClosed = await prisma.cashShift.findFirst({
        where: { cashRegisterId: register.id, isOpen: false },
        orderBy: { closedAt: 'desc' },
      });

      const actualOpening = Number(openingBalance) || 0;
      const expectedOpening = lastClosed ? Number(lastClosed.closingBalance) : actualOpening;
      const openingDifference = actualOpening - expectedOpening;

      const newShift = await prisma.cashShift.create({
        data: {
          cashRegisterId: register.id,
          openedByUserId: userId,
          openingBalance: actualOpening,
          expectedOpeningBalance: expectedOpening,
          openingDifference,
          openingNotes: openingNotes ? openingNotes.trim() : null,
          cashCountBreakdown: breakdown || null,
          isOpen: true,
        },
      });

      return NextResponse.json(createSuccessResponse(newShift), { status: 201 });
    }

    // ACCIÓN 2: CIERRE INMUTABLE DE CAJA Y ARQUEO FINAL
    if (action === 'CLOSE' && shiftId) {
      const shift = await prisma.cashShift.findUnique({
        where: { id: shiftId },
        include: {
          sales: true,
          movements: true,
          customerPayments: true,
        },
      });

      if (!shift) {
        return NextResponse.json(createErrorResponse('Turno de caja no encontrado', 'NOT_FOUND'), { status: 404 });
      }

      if (!shift.isOpen) {
        return NextResponse.json(
          createErrorResponse('Este turno de caja ya fue cerrado previamente. Las cajas cerradas son inmutables.', 'SHIFT_ALREADY_CLOSED'),
          { status: 403 }
        );
      }

      // 1. Ventas CONTADO cobradas en efectivo de mostrador
      const cashSalesTotal = shift.sales
        .filter((s) => s.paymentMethod === 'EFECTIVO' && s.paymentCondition === 'CONTADO' && s.status === 'COMPLETED')
        .reduce((sum, s) => sum + Number(s.grandTotal), 0);

      // 1.1 Cobros de cuentas corrientes o pagos a cuenta cobrados en efectivo
      const customerPaymentsCashTotal = (shift.customerPayments || [])
        .filter((p) => p.paymentMethod === 'EFECTIVO')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      // 2. Ingresos de sencillo
      const incomesTotal = shift.movements
        .filter((m) => m.type === 'INCOME_CHANGE')
        .reduce((sum, m) => sum + Number(m.amount), 0);

      // 3. Egresos operativos y adelantos
      const expensesTotal = shift.movements
        .filter((m) => m.type === 'EXPENSE_OPERATION' || m.type === 'EXPENSE_ADVANCE')
        .reduce((sum, m) => sum + Number(m.amount), 0);

      // 4. Extracciones de billetes grandes a sobres / caja fuerte
      const safeDepositsTotal = shift.movements
        .filter((m) => m.type === 'SAFE_DEPOSIT')
        .reduce((sum, m) => sum + Number(m.amount), 0);

      // 5. Saldo esperado en el cajón del mostrador
      const expectedInDrawer = Number(shift.openingBalance) + cashSalesTotal + customerPaymentsCashTotal + incomesTotal - expensesTotal - safeDepositsTotal;
      const actualDeclared = Number(closingBalance) || 0;
      const difference = actualDeclared - expectedInDrawer;

      const closedShift = await prisma.cashShift.update({
        where: { id: shiftId },
        data: {
          closedByUserId: userId,
          closedAt: new Date(),
          closingBalance: actualDeclared,
          expectedBalance: expectedInDrawer,
          difference,
          totalCashSales: cashSalesTotal,
          totalIncomes: incomesTotal,
          totalExpenses: expensesTotal,
          totalSafeDeposits: safeDepositsTotal,
          closingNotes: notes ? notes.trim() : null,
          cashCountBreakdown: breakdown || null,
          isOpen: false, // Turno cerrado e inmutable
        },
      });

      return NextResponse.json(createSuccessResponse(closedShift));
    }

    return NextResponse.json(createErrorResponse('Acción inválida', 'BAD_REQUEST'), { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'SHIFT_PROCESS_ERROR'),
      { status: 500 }
    );
  }
}

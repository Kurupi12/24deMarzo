import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { verifyAndConsumeSupervisorOtp } from '@/lib/auth/otp-verifier';
import { getSessionUser } from '@/lib/auth/session';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessionUser = await getSessionUser();

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

    const currentShiftOwner = currentShift
      ? await prisma.user.findUnique({
          where: { id: currentShift.openedByUserId },
          select: { id: true, name: true, role: true },
        })
      : null;

    const isCurrentShiftOwnedBySession = Boolean(
      sessionUser && currentShift && currentShift.openedByUserId === sessionUser.id
    );

    // 2. Buscar último turno cerrado para la comprobación inicial a ciegas (Blind Count)
    const lastClosedShift = await prisma.cashShift.findFirst({
      where: { cashRegisterId: register.id, isOpen: false },
      orderBy: { closedAt: 'desc' },
      select: {
        id: true,
        openedAt: true,
        closedAt: true,
        closingBalance: true,
        expectedBalance: true,
        difference: true,
        closingNotes: true,
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

    // 4.1 Transferencias SIPAP sin N° de comprobante (incluye días anteriores para que no se pase ningún cobro)
    const pendingTransfersRaw = await prisma.sale.findMany({
      where: {
        paymentMethod: 'TRANSFERENCIA_BANCARIA',
        paymentCondition: { not: 'A_CUENTA' },
        status: { notIn: ['QUOTATION', 'CANCELLED'] },
        OR: [{ paymentReference: null }, { paymentReference: '' }],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        saleNumber: true,
        customerName: true,
        customerRuc: true,
        grandTotal: true,
        paymentCondition: true,
        paymentMethod: true,
        deliveryStatus: true,
        cashShiftId: true,
        createdAt: true,
      },
      take: 100,
    });

    const pendingTransfers = pendingTransfersRaw.map((t) => ({
      ...t,
      grandTotal: Number(t.grandTotal),
    }));
    const pendingTransfersTotal = pendingTransfers.reduce((sum, t) => sum + t.grandTotal, 0);

    return NextResponse.json(
      createSuccessResponse({
        register,
        currentShift,
        currentShiftOwner: currentShiftOwner || (currentShift ? { id: currentShift.openedByUserId, name: 'Operador de Caja', role: null } : null),
        isCurrentShiftOwnedBySession,
        lastClosedShift,
        metrics,
        history,
        pendingTransfers,
        pendingTransfersTotal,
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
    const { action, openingBalance, closingBalance, shiftId, notes, openingNotes, breakdown, code, reason } = body;

    const sessionUser = await getSessionUser();
    const admin = await prisma.user.findFirst({ select: { id: true, name: true } });
    const userId = sessionUser?.id || req.headers.get('x-user-id') || admin?.id || 'cajera-central';

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

      // 6. Registrar en el acta de cierre las transferencias del turno que quedaron sin comprobante
      const unconfirmedTransfers = shift.sales.filter(
        (s) =>
          s.paymentMethod === 'TRANSFERENCIA_BANCARIA' &&
          s.paymentCondition !== 'A_CUENTA' &&
          s.status !== 'QUOTATION' &&
          s.status !== 'CANCELLED' &&
          !s.paymentReference?.trim()
      );
      const pendingAuditNote =
        unconfirmedTransfers.length > 0
          ? `[Transferencias sin comprobante al cierre (${unconfirmedTransfers.length}): ${unconfirmedTransfers
              .map((s) => `${s.saleNumber} ${s.customerName} (${Number(s.grandTotal).toLocaleString('es-PY')} Gs)`)
              .join(' | ')}]`
          : '';
      const combinedNotes = [shift.closingNotes?.trim(), notes?.trim(), pendingAuditNote].filter(Boolean).join(' — ') || null;

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
          closingNotes: combinedNotes,
          cashCountBreakdown: breakdown || null,
          isOpen: false, // Turno cerrado e inmutable
        },
      });

      return NextResponse.json(createSuccessResponse(closedShift));
    }

    // ACCIÓN 3: REAPERTURA / CORRECCIÓN AUDITADA DE ÚLTIMO CIERRE CON OTP DE ÚNICO USO (OSVALDO)
    if (action === 'REOPEN' && shiftId) {
      const cleanReason = String(reason || '').trim();
      if (!cleanReason) {
        return NextResponse.json(
          createErrorResponse('Debe indicar el motivo de la corrección o reapertura de caja.', 'VALIDATION_ERROR'),
          { status: 422 }
        );
      }

      const existingOpen = await prisma.cashShift.findFirst({
        where: { cashRegisterId: register.id, isOpen: true },
        select: { id: true },
      });
      if (existingOpen) {
        return NextResponse.json(
          createErrorResponse('Ya existe un turno de caja abierto actualmente. No se puede reabrir un cierre anterior mientras otro turno está abierto.', 'SHIFT_ALREADY_OPEN'),
          { status: 400 }
        );
      }

      const latestClosed = await prisma.cashShift.findFirst({
        where: { cashRegisterId: register.id, isOpen: false },
        orderBy: { closedAt: 'desc' },
        select: { id: true },
      });
      if (!latestClosed || latestClosed.id !== shiftId) {
        return NextResponse.json(
          createErrorResponse('Solo se puede corregir o reabrir el último cierre de caja registrado.', 'INVALID_REOPEN_TARGET'),
          { status: 400 }
        );
      }

      const targetShift = await prisma.cashShift.findUnique({
        where: { id: shiftId },
      });
      if (!targetShift || targetShift.isOpen) {
        return NextResponse.json(
          createErrorResponse('El cierre indicado no existe o ya se encuentra abierto.', 'NOT_FOUND'),
          { status: 404 }
        );
      }

      const auth = await verifyAndConsumeSupervisorOtp({
        code,
        usedById: sessionUser?.id || null,
        usageNote: `Reapertura de cierre accidental de caja (${cleanReason})`,
      });

      const prevTime = new Date(targetShift.closedAt || targetShift.updatedAt).toLocaleString('es-PY', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
      const reopenAuditNote = `[Reapertura autorizada por ${auth.authorizedBy} (${
        auth.type === 'OTP_TOKEN' ? `OTP ${auth.cleanCode}` : 'PIN Directo'
      }) | Cierre accidental previo (${prevTime}): Declarado ${Number(
        targetShift.closingBalance || 0
      ).toLocaleString('es-PY')} Gs. | Motivo: ${cleanReason}]`;

      const nextNotes = [targetShift.closingNotes?.trim(), reopenAuditNote].filter(Boolean).join(' — ');

      const reopenedShift = await prisma.cashShift.update({
        where: { id: shiftId },
        data: {
          isOpen: true,
          closedAt: null,
          closingNotes: nextNotes,
        },
      });

      return NextResponse.json(createSuccessResponse(reopenedShift));
    }

    return NextResponse.json(createErrorResponse('Acción inválida', 'BAD_REQUEST'), { status: 400 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        createErrorResponse(error.message, error.code || 'SHIFT_PROCESS_ERROR'),
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      createErrorResponse(error.message, 'SHIFT_PROCESS_ERROR'),
      { status: 500 }
    );
  }
}

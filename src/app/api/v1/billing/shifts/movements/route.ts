import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shiftId = searchParams.get('shiftId') || undefined;

    let targetShiftId: string | undefined = shiftId;
    if (!targetShiftId) {
      const activeShift = await prisma.cashShift.findFirst({
        where: { isOpen: true },
        orderBy: { openedAt: 'desc' },
      });
      targetShiftId = activeShift?.id;
    }

    if (!targetShiftId) {
      return NextResponse.json(createSuccessResponse([]));
    }

    const movements = await prisma.cashMovement.findMany({
      where: { cashShiftId: targetShiftId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(createSuccessResponse(movements));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'MOVEMENTS_FETCH_ERROR'),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      shiftId,
      type, // INCOME_CHANGE, EXPENSE_OPERATION, EXPENSE_ADVANCE, SAFE_DEPOSIT
      category,
      amount,
      description,
      beneficiary,
      envelopeCode,
      receiptNo,
    } = body;

    if (!type || !amount || Number(amount) <= 0 || !description) {
      return NextResponse.json(
        createErrorResponse('Tipo, monto mayor a cero y motivo/justificación son obligatorios', 'VALIDATION_ERROR'),
        { status: 422 }
      );
    }

    // Buscar turno activo
    let targetShiftId: string | undefined = shiftId || undefined;
    if (!targetShiftId) {
      const activeShift = await prisma.cashShift.findFirst({
        where: { isOpen: true },
        orderBy: { openedAt: 'desc' },
      });
      targetShiftId = activeShift?.id;
    }

    if (!targetShiftId) {
      return NextResponse.json(
        createErrorResponse('No hay ningún turno de caja abierto para registrar movimientos.', 'NO_ACTIVE_SHIFT'),
        { status: 400 }
      );
    }

    // Verificar que el turno no esté cerrado (inmutabilidad)
    const shift = await prisma.cashShift.findUnique({
      where: { id: targetShiftId },
    });

    if (!shift || !shift.isOpen) {
      return NextResponse.json(
        createErrorResponse('La caja ya fue cerrada. Los turnos cerrados son inmutables y no admiten movimientos.', 'SHIFT_LOCKED'),
        { status: 403 }
      );
    }

    const movement = await prisma.cashMovement.create({
      data: {
        cashShiftId: targetShiftId,
        type: type as any,
        category: category || (type === 'SAFE_DEPOSIT' ? 'EXTRACCION_SOBRE' : type === 'INCOME_CHANGE' ? 'SENCILLO' : 'GASTO_OPERATIVO'),
        amount: Number(amount),
        description: description.trim(),
        beneficiary: beneficiary ? beneficiary.trim() : null,
        envelopeCode: envelopeCode ? envelopeCode.trim() : null,
        receiptNo: receiptNo ? receiptNo.trim() : null,
      },
    });

    return NextResponse.json(createSuccessResponse(movement), { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'MOVEMENT_CREATE_ERROR'),
      { status: 500 }
    );
  }
}


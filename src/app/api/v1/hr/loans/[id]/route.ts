import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addDays } from 'date-fns';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const loanId = params.id;
    const body = await req.json();
    const { action, status, amount, installmentId, notes } = body;

    const loan = await prisma.employeeLoan.findUnique({
      where: { id: loanId },
      include: {
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });

    if (!loan) {
      return NextResponse.json(
        { success: false, error: 'Préstamo no encontrado' },
        { status: 404 }
      );
    }

    // 1. Cambio de estado general
    if (action === 'status' && status) {
      const updated = await prisma.employeeLoan.update({
        where: { id: loanId },
        data: { status },
      });
      return NextResponse.json({
        success: true,
        data: updated,
        message: `Estado del préstamo actualizado a ${status}`,
      });
    }

    // 2. Abono extraordinario / Pago manual en efectivo
    if (action === 'manual_payment' && amount) {
      const paymentAmount = Number(amount);
      if (paymentAmount <= 0) {
        return NextResponse.json(
          { success: false, error: 'El monto del abono debe ser mayor a cero' },
          { status: 400 }
        );
      }

      const updatedLoan = await prisma.$transaction(async (tx) => {
        let remainingToApply = paymentAmount;
        const pendingInsts = loan.installments.filter((i) => !i.isDeducted);

        for (const inst of pendingInsts) {
          if (remainingToApply <= 0) break;
          const instAmount = Number(inst.amount);

          if (remainingToApply >= instAmount) {
            await tx.loanInstallment.update({
              where: { id: inst.id },
              data: {
                isDeducted: true,
                deductedDate: new Date(),
                notes: notes ? `Abono extraordinario: ${notes}` : 'Abono extraordinario en efectivo',
              },
            });
            remainingToApply -= instAmount;
          } else {
            // Pago parcial de la cuota: reduce el monto de esta cuota
            await tx.loanInstallment.update({
              where: { id: inst.id },
              data: {
                amount: instAmount - remainingToApply,
                notes: `Abono parcial de Gs. ${remainingToApply.toLocaleString('es-PY')}`,
              },
            });
            remainingToApply = 0;
          }
        }

        const newPaid = Number(loan.totalPaid) + paymentAmount;
        const newBalance = Math.max(0, Number(loan.remainingBalance) - paymentAmount);
        const paidCount = await tx.loanInstallment.count({
          where: { loanId: loan.id, isDeducted: true },
        });

        return tx.employeeLoan.update({
          where: { id: loanId },
          data: {
            totalPaid: newPaid,
            remainingBalance: newBalance,
            paidInstallments: paidCount,
            status: newBalance <= 0 ? 'PAID' : loan.status,
          },
          include: { installments: true },
        });
      });

      return NextResponse.json({
        success: true,
        data: updatedLoan,
        message: `Abono de Gs. ${paymentAmount.toLocaleString('es-PY')} registrado exitosamente. Saldo restante: Gs. ${Number(updatedLoan.remainingBalance).toLocaleString('es-PY')}`,
      });
    }

    // 3. Pausar cuota de la semana (desplazar 7 días hacia adelante)
    if (action === 'skip_installment' && installmentId) {
      const inst = loan.installments.find((i) => i.id === installmentId);
      if (!inst) {
        return NextResponse.json(
          { success: false, error: 'Cuota no encontrada' },
          { status: 404 }
        );
      }

      await prisma.$transaction(async (tx) => {
        // Desplazar esta cuota y todas las posteriores 7 días
        const laterInstallments = loan.installments.filter(
          (i) => i.installmentNumber >= inst.installmentNumber && !i.isDeducted
        );

        for (const item of laterInstallments) {
          await tx.loanInstallment.update({
            where: { id: item.id },
            data: {
              scheduledDate: addDays(new Date(item.scheduledDate), 7),
              notes: item.id === inst.id ? 'Pausado por solicitud del funcionario' : item.notes,
            },
          });
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Cuota pausada correctamente. Las cuotas pendientes se desplazaron 1 semana.',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Acción no válida' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error al actualizar préstamo:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al actualizar préstamo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const loanId = params.id;
    const loan = await prisma.employeeLoan.findUnique({
      where: { id: loanId },
      include: { installments: { where: { isDeducted: true } } },
    });

    if (!loan) {
      return NextResponse.json(
        { success: false, error: 'Préstamo no encontrado' },
        { status: 404 }
      );
    }

    if (loan.installments.length > 0) {
      return NextResponse.json(
        { success: false, error: 'No se puede eliminar un préstamo que ya tiene cuotas descontadas. Puede marcarlo como CANCELADO.' },
        { status: 400 }
      );
    }

    await prisma.employeeLoan.delete({
      where: { id: loanId },
    });

    return NextResponse.json({
      success: true,
      message: 'Préstamo eliminado correctamente',
    });
  } catch (error: any) {
    console.error('Error al eliminar préstamo:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar préstamo' },
      { status: 500 }
    );
  }
}


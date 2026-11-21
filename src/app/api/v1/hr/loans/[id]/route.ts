import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addDays } from 'date-fns';
import { getSessionUser } from '@/lib/auth/session';

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
      }, {
        maxWait: 10000,
        timeout: 30000,
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

      if (inst.isDeducted) {
        return NextResponse.json(
          { success: false, error: 'Esta cuota ya fue cobrada y no puede pausarse.' },
          { status: 400 }
        );
      }

      const updatedLoan = await prisma.$transaction(async (tx) => {
        // Desplazar esta cuota y todas las posteriores pendientes 7 días en paralelo
        const laterInstallments = loan.installments.filter(
          (i) => i.installmentNumber >= inst.installmentNumber && !i.isDeducted
        );

        await Promise.all(
          laterInstallments.map((item) =>
            tx.loanInstallment.update({
              where: { id: item.id },
              data: {
                scheduledDate: addDays(new Date(item.scheduledDate), 7),
                notes:
                  item.id === inst.id
                    ? 'Pausado por solicitud del funcionario (+7 días)'
                    : item.notes,
              },
            })
          )
        );

        return tx.employeeLoan.findUnique({
          where: { id: loanId },
          include: {
            employee: {
              select: {
                id: true,
                code: true,
                firstName: true,
                lastName: true,
                documentNumber: true,
                jobTitle: true,
              },
            },
            installments: { orderBy: { installmentNumber: 'asc' } },
          },
        });
      }, {
        maxWait: 10000,
        timeout: 30000,
      });

      const formattedLoan = updatedLoan
        ? {
            id: updatedLoan.id,
            loanNumber: updatedLoan.loanNumber,
            employee: updatedLoan.employee,
            totalAmount: Number(updatedLoan.totalAmount),
            installmentAmount: Number(updatedLoan.installmentAmount),
            totalInstallments: updatedLoan.totalInstallments,
            paidInstallments: updatedLoan.paidInstallments,
            totalPaid: Number(updatedLoan.totalPaid),
            remainingBalance: Number(updatedLoan.remainingBalance),
            issueDate: updatedLoan.issueDate,
            firstDeductionDate: updatedLoan.firstDeductionDate,
            status: updatedLoan.status,
            reason: updatedLoan.reason,
            notes: updatedLoan.notes,
            disbursedFromCash: updatedLoan.disbursedFromCash,
            installments: updatedLoan.installments.map((i) => ({
              id: i.id,
              installmentNumber: i.installmentNumber,
              amount: Number(i.amount),
              scheduledDate: i.scheduledDate,
              deductedDate: i.deductedDate,
              isDeducted: i.isDeducted,
              isSkipped: i.isSkipped,
              settlementPeriod: i.settlementPeriod,
              notes: i.notes,
            })),
          }
        : null;

      return NextResponse.json({
        success: true,
        data: formattedLoan,
        message: 'Cuota pausada correctamente. Las cuotas pendientes se desplazaron 1 semana (+7 días).',
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
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Permiso exclusivo para Osvaldo / Dirección (SUPER_ADMIN)
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Acceso denegado: Solo la Dirección (Osvaldo) tiene permiso exclusivo para eliminar un préstamo completo.',
        },
        { status: 403 }
      );
    }

    const loanId = params.id;
    const loan = await prisma.employeeLoan.findUnique({
      where: { id: loanId },
      include: { installments: true },
    });

    if (!loan) {
      return NextResponse.json(
        { success: false, error: 'Préstamo no encontrado' },
        { status: 404 }
      );
    }

    const deletedInstallmentsCount = loan.installments.length;
    const deductedCount = loan.installments.filter((i) => i.isDeducted).length;
    let cashReverted = false;

    await prisma.$transaction(async (tx) => {
      // Si el desembolso salió de un turno de caja que TODAVÍA está abierto hoy, revertir ese movimiento para no descuadrar el cierre
      if (loan.disbursedFromCash) {
        const openShift = await tx.cashShift.findFirst({
          where: { closedAt: null },
          orderBy: { openedAt: 'desc' },
        });

        if (openShift) {
          const matchingMovement = await tx.cashMovement.findFirst({
            where: {
              cashShiftId: openShift.id,
              category: 'PRESTAMO_PERSONAL',
              description: { contains: loan.loanNumber },
            },
          });

          if (matchingMovement) {
            await tx.cashMovement.delete({ where: { id: matchingMovement.id } });
            await tx.cashShift.update({
              where: { id: openShift.id },
              data: {
                totalExpenses: { decrement: Number(matchingMovement.amount) },
              },
            });
            cashReverted = true;
          }
        }
      }

      // Al eliminar EmployeeLoan, todas sus LoanInstallment se eliminan en cascada (onDelete: Cascade)
      await tx.employeeLoan.delete({
        where: { id: loanId },
      });
    }, {
      maxWait: 10000,
      timeout: 30000,
    });

    return NextResponse.json({
      success: true,
      data: {
        deletedLoanNumber: loan.loanNumber,
        deletedInstallmentsCount,
        deductedCount,
        cashReverted,
      },
      message: `Préstamo ${loan.loanNumber} eliminado completamente (${deletedInstallmentsCount} cuota(s) removidas${cashReverted ? ' y egreso revertido en caja abierta' : ''}).`,
    });
  } catch (error: any) {
    console.error('Error al eliminar préstamo:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar préstamo' },
      { status: 500 }
    );
  }
}


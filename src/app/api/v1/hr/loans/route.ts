import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addDays } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const loans = await prisma.employeeLoan.findMany({
      where,
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
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: loans.map((loan) => ({
        id: loan.id,
        loanNumber: loan.loanNumber,
        employee: loan.employee,
        totalAmount: Number(loan.totalAmount),
        installmentAmount: Number(loan.installmentAmount),
        totalInstallments: loan.totalInstallments,
        paidInstallments: loan.paidInstallments,
        totalPaid: Number(loan.totalPaid),
        remainingBalance: Number(loan.remainingBalance),
        issueDate: loan.issueDate,
        firstDeductionDate: loan.firstDeductionDate,
        status: loan.status,
        reason: loan.reason,
        notes: loan.notes,
        disbursedFromCash: loan.disbursedFromCash,
        installments: loan.installments.map((inst) => ({
          id: inst.id,
          installmentNumber: inst.installmentNumber,
          amount: Number(inst.amount),
          scheduledDate: inst.scheduledDate,
          deductedDate: inst.deductedDate,
          isDeducted: inst.isDeducted,
          isSkipped: inst.isSkipped,
          settlementPeriod: inst.settlementPeriod,
        })),
      })),
    });
  } catch (error: any) {
    console.error('Error al obtener préstamos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al listar préstamos' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      employeeId,
      totalAmount,
      installmentAmount,
      totalInstallments: requestedInstallments,
      issueDate,
      firstDeductionDate,
      reason,
      notes,
      disbursedFromCash,
    } = body;

    if (!employeeId || !totalAmount) {
      return NextResponse.json(
        { success: false, error: 'Empleado y monto total son obligatorios' },
        { status: 400 }
      );
    }

    const tAmount = Number(totalAmount);
    let instAmount = Number(installmentAmount) || 0;
    let totalInstallments = Number(requestedInstallments) || 0;

    if (totalInstallments > 0 && instAmount <= 0) {
      instAmount = Math.ceil(tAmount / totalInstallments);
    } else if (instAmount > 0 && totalInstallments <= 0) {
      totalInstallments = Math.ceil(tAmount / instAmount);
    }

    if (tAmount <= 0 || instAmount <= 0 || totalInstallments <= 0) {
      return NextResponse.json(
        { success: false, error: 'El monto total y el plan de cuotas deben ser mayores a cero' },
        { status: 400 }
      );
    }

    if (instAmount > tAmount) {
      return NextResponse.json(
        { success: false, error: 'La cuota semanal no puede ser mayor al monto total' },
        { status: 400 }
      );
    }

    // Fechas
    const loanIssueDate = issueDate ? new Date(issueDate) : new Date();
    
    // Si no se especifica primer sábado, buscar el próximo sábado
    // Para financiación de sobregiros (disbursedFromCash = false), la deducción inicia indefectiblemente el SÁBADO DE LA PRÓXIMA SEMANA
    let firstSatDate: Date;
    if (firstDeductionDate) {
      firstSatDate = String(firstDeductionDate).includes('T')
        ? new Date(firstDeductionDate)
        : new Date(`${firstDeductionDate}T12:00:00Z`);
    } else {
      const today = new Date(loanIssueDate);
      const dayOfWeek = today.getDay(); // 0 domingo, 6 sabado
      const daysUntilThisSat = (6 - dayOfWeek + 7) % 7;
      const daysOffset = !disbursedFromCash ? (daysUntilThisSat === 0 ? 7 : daysUntilThisSat + 7) : (daysUntilThisSat || 7);
      firstSatDate = addDays(today, daysOffset);
    }

    // Generar consecutivo de préstamo: PREST-0001
    const totalCount = await prisma.employeeLoan.count();
    const loanNumber = `PREST-${String(totalCount + 1).padStart(4, '0')}`;

    // Crear el préstamo y sus cuotas en una transacción
    const newLoan = await prisma.$transaction(async (tx) => {
      const loan = await tx.employeeLoan.create({
        data: {
          loanNumber,
          employeeId,
          totalAmount: tAmount,
          installmentAmount: instAmount,
          totalInstallments,
          paidInstallments: 0,
          totalPaid: 0,
          remainingBalance: tAmount,
          issueDate: loanIssueDate,
          firstDeductionDate: firstSatDate,
          status: 'ACTIVE',
          reason: reason ? String(reason).trim() : null,
          notes: notes ? String(notes).trim() : null,
          disbursedFromCash: Boolean(disbursedFromCash),
        },
      });

      // Crear cada una de las cuotas programadas (consecutivas cada 7 días)
      let currentBalance = tAmount;
      const installmentsData = [];

      for (let i = 1; i <= totalInstallments; i++) {
        const scheduledDate = addDays(firstSatDate, (i - 1) * 7);
        // Última cuota ajusta si no es división exacta
        const cuotaMonto = i === totalInstallments ? currentBalance : Math.min(instAmount, currentBalance);
        currentBalance -= cuotaMonto;

        installmentsData.push({
          loanId: loan.id,
          installmentNumber: i,
          amount: cuotaMonto,
          scheduledDate,
          isDeducted: false,
          isSkipped: false,
        });
      }

      await tx.loanInstallment.createMany({
        data: installmentsData,
      });

      // Si el préstamo se desembolsa con dinero físico de Caja Chica, registrar automáticamente el egreso en el turno abierto
      if (Boolean(disbursedFromCash)) {
        const activeShift = await tx.cashShift.findFirst({
          where: { closedAt: null },
          orderBy: { openedAt: 'desc' },
        });

        if (activeShift) {
          const emp = await tx.employee.findUnique({
            where: { id: employeeId },
            select: { firstName: true, lastName: true },
          });
          const beneficiaryName = emp ? `${emp.firstName} ${emp.lastName}` : null;

          await tx.cashMovement.create({
            data: {
              cashShiftId: activeShift.id,
              type: 'EXPENSE_ADVANCE',
              category: 'PRESTAMO_PERSONAL',
              amount: tAmount,
              description: `Desembolso físico de efectivo por Préstamo ${loanNumber}${reason ? `: ${reason}` : ''}`,
              beneficiary: beneficiaryName,
            },
          });

          await tx.cashShift.update({
            where: { id: activeShift.id },
            data: {
              totalExpenses: { increment: tAmount },
            },
          });
        }
      }

      return tx.employeeLoan.findUnique({
        where: { id: loan.id },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, code: true },
          },
          installments: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: newLoan,
      message: `Préstamo ${loanNumber} registrado exitosamente (${totalInstallments} cuotas de Gs. ${instAmount.toLocaleString('es-PY')})`,
    });
  } catch (error: any) {
    console.error('Error al crear préstamo:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al procesar préstamo' },
      { status: 500 }
    );
  }
}


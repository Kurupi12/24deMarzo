import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Fechas por defecto: Semana en curso (de Lunes a Sábado)
    const now = new Date();
    const currentDay = now.getDay(); // 0 es Domingo, 1 es Lunes
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const defaultMonday = new Date(now);
    defaultMonday.setDate(now.getDate() + diffToMonday);
    defaultMonday.setHours(0, 0, 0, 0);

    const defaultSaturday = new Date(defaultMonday);
    defaultSaturday.setDate(defaultMonday.getDate() + 5); // Sábado
    defaultSaturday.setHours(23, 59, 59, 999);

    const startDate = startDateParam ? new Date(`${startDateParam}T00:00:00Z`) : defaultMonday;
    const endDate = endDateParam ? new Date(`${endDateParam}T23:59:59.999Z`) : defaultSaturday;

    // Obtener todos los colaboradores activos con sus adelantos y préstamos activos
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        salaryStructure: true,
        advancePayments: {
          where: {
            requestDate: {
              gte: startDate,
              lte: endDate,
            },
            status: 'APPROVED',
          },
          orderBy: { requestDate: 'asc' },
        },
        loans: {
          where: { status: 'ACTIVE' },
          include: {
            installments: {
              where: {
                isDeducted: false,
                isSkipped: false,
              },
              orderBy: { installmentNumber: 'asc' },
            },
          },
        },
      },
      orderBy: [{ jobTitle: 'asc' }, { lastName: 'asc' }],
    });

    const settlements = employees.map((emp) => {
      const weeklySalary = Number(emp.salaryStructure?.weeklySalary || 0);
      
      // 1. Vales / Adelantos de la semana
      const advances = emp.advancePayments.map((adv) => ({
        id: adv.id,
        amount: Number(adv.amount),
        requestDate: adv.requestDate,
        reason: adv.reason || 'Vale / Anticipo semanal',
        notes: adv.notes || null,
      }));
      const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);

      // 2. Cuotas de préstamos activas correspondientes a esta semana (vencimiento <= endDate)
      const loanDeductions = emp.loans.flatMap((loan) => {
        const dueInstallment = loan.installments.find((inst) => new Date(inst.scheduledDate) <= endDate);
        if (!dueInstallment) return [];

        const instAmount = Number(dueInstallment.amount);
        const remBalance = Math.max(0, Number(loan.remainingBalance) - instAmount);

        return [{
          loanId: loan.id,
          installmentId: dueInstallment.id,
          loanNumber: loan.loanNumber,
          installmentNumber: dueInstallment.installmentNumber,
          totalInstallments: loan.totalInstallments,
          amount: instAmount,
          originalBalance: Number(loan.remainingBalance),
          remainingBalance: remBalance,
          scheduledDate: dueInstallment.scheduledDate,
        }];
      });
      const totalLoans = loanDeductions.reduce((sum, l) => sum + l.amount, 0);

      // 3. Préstamos de financiación de sobregiros registrados para este periodo o personal
      // Detecta préstamos que no movieron caja física (disbursedFromCash = false) o creados para sobregiro
      const endDateExtended = new Date(endDate.getTime() + 2 * 24 * 60 * 60 * 1000); // margen de 48h fin de semana
      const overdraftLoans = emp.loans.filter((loan) => {
        const isNonCash = !loan.disbursedFromCash;
        const hasReason = loan.reason?.toLowerCase().includes('sobregiro');
        const isRecent = new Date(loan.issueDate) >= startDate && new Date(loan.issueDate) <= endDateExtended;
        return (isNonCash || hasReason) && isRecent;
      });

      const financedOverdraftAmount = overdraftLoans.reduce((sum, l) => sum + Number(l.totalAmount), 0);
      const financedLoans = overdraftLoans.map((l) => ({
        loanId: l.id,
        loanNumber: l.loanNumber,
        amount: Number(l.totalAmount),
        totalInstallments: l.totalInstallments,
        installmentAmount: Number(l.installmentAmount),
        firstDeductionDate: l.firstDeductionDate,
      }));

      // Total de deducciones brutas y cálculo de sobregiros
      const rawTotalDeductions = totalAdvances + totalLoans;
      const rawOverdraft = Math.max(0, rawTotalDeductions - weeklySalary);
      const pendingOverdraftAmount = Math.max(0, rawOverdraft - financedOverdraftAmount);
      const isOverdrawn = pendingOverdraftAmount > 0;
      const hasFinancedOverdraft = financedOverdraftAmount > 0;

      // Deducción efectiva contra el salario semanal (el monto ya financiado en cuotas no se descuenta de nuevo aquí)
      const effectiveAdvances = Math.max(0, totalAdvances - financedOverdraftAmount);
      const totalDeductions = effectiveAdvances + totalLoans;
      const netPayable = Math.max(0, weeklySalary - totalDeductions);

      return {
        id: emp.id,
        code: emp.code,
        firstName: emp.firstName,
        lastName: emp.lastName,
        documentNumber: emp.documentNumber,
        jobTitle: emp.jobTitle,
        phone: emp.phone,
        weeklySalary,
        advances,
        totalAdvances,
        loanDeductions,
        totalLoans,
        totalDeductions,
        rawTotalDeductions,
        netPayable,
        isOverdrawn,
        overdraftAmount: pendingOverdraftAmount,
        hasFinancedOverdraft,
        financedOverdraftAmount,
        financedLoans,
      };
    });

    const totalWeeklySalary = settlements.reduce((sum, s) => sum + s.weeklySalary, 0);
    const totalAdvances = settlements.reduce((sum, s) => sum + s.totalAdvances, 0);
    const totalLoans = settlements.reduce((sum, s) => sum + s.totalLoans, 0);
    const totalNetPayable = settlements.reduce((sum, s) => sum + s.netPayable, 0);

    return NextResponse.json(
      createSuccessResponse({
        period: {
          startDate: startDate.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
        },
        summary: {
          totalEmployees: settlements.length,
          totalWeeklySalary,
          totalAdvances,
          totalLoans,
          totalDeductions: totalAdvances + totalLoans,
          totalNetPayable,
        },
        settlements,
      })
    );
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'SETTLEMENTS_FETCH_ERROR'),
      { status: 500 }
    );
  }
}

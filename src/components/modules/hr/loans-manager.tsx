'use client';

import React, { useState, useEffect } from 'react';
import {
  Coins,
  Plus,
  Search,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
  TrendingDown,
  DollarSign,
  User,
  PauseCircle,
  PlayCircle,
  X,
  CreditCard,
  Layers,
  CalendarDays,
  FileText,
  BadgePercent,
  Check,
} from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';

interface LoanInstallment {
  id: string;
  installmentNumber: number;
  amount: number;
  scheduledDate: string;
  deductedDate: string | null;
  isDeducted: boolean;
  isSkipped: boolean;
  settlementPeriod: string | null;
}

interface EmployeeLoan {
  id: string;
  loanNumber: string;
  employee: {
    id: string;
    code: string;
    firstName: string;
    lastName: string;
    documentNumber: string;
    jobTitle: string;
  };
  totalAmount: number;
  installmentAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  totalPaid: number;
  remainingBalance: number;
  issueDate: string;
  firstDeductionDate: string;
  status: 'ACTIVE' | 'PAID' | 'PAUSED' | 'CANCELLED';
  reason?: string | null;
  notes?: string | null;
  disbursedFromCash: boolean;
  installments: LoanInstallment[];
}

export function LoansManager() {
  const [loans, setLoans] = useState<EmployeeLoan[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Nuevo Préstamo
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [firstDeductionDate, setFirstDeductionDate] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const daysUntilNextSat = (6 - day + 7) % 7 || 7;
    const nextSat = new Date(today);
    nextSat.setDate(today.getDate() + daysUntilNextSat);
    return nextSat.toISOString().slice(0, 10);
  });
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [disbursedFromCash, setDisbursedFromCash] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Ver Cronograma / Cuotas
  const [selectedLoan, setSelectedLoan] = useState<EmployeeLoan | null>(null);

  // Modal Abono Extraordinario
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const fetchLoans = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/hr/loans');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLoans(json.data);
      }
    } catch (err) {
      console.error('Error fetching loans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/v1/hr/employees');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setEmployees(json.data.filter((e: any) => e.status === 'ACTIVE'));
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  useEffect(() => {
    fetchLoans();
    fetchEmployees();
  }, []);

  // Calcular número de cuotas en vivo en el modal
  const computedInstallments =
    Number(totalAmount) > 0 && Number(installmentAmount) > 0
      ? Math.ceil(Number(totalAmount) / Number(installmentAmount))
      : 0;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !totalAmount || !installmentAmount) return;

    setIsSubmitting(true);
    setCreateFeedback(null);

    try {
      const res = await fetch('/api/v1/hr/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          totalAmount: Number(totalAmount),
          installmentAmount: Number(installmentAmount),
          issueDate,
          firstDeductionDate,
          reason,
          notes,
          disbursedFromCash,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setCreateFeedback({ type: 'success', text: json.message || 'Préstamo creado exitosamente.' });
        await fetchLoans();
        setTimeout(() => {
          setIsCreateModalOpen(false);
          setSelectedEmployeeId('');
          setTotalAmount('');
          setInstallmentAmount('');
          setReason('');
          setNotes('');
          setCreateFeedback(null);
        }, 900);
      } else {
        setCreateFeedback({ type: 'error', text: json.error || 'Error al registrar préstamo' });
      }
    } catch (err: any) {
      setCreateFeedback({ type: 'error', text: err.message || 'Error de conexión' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (loan: EmployeeLoan) => {
    const newStatus = loan.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/v1/hr/loans/${loan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setLoans((prev) => prev.map((l) => (l.id === loan.id ? { ...l, status: newStatus } : l)));
        if (selectedLoan && selectedLoan.id === loan.id) {
          setSelectedLoan({ ...selectedLoan, status: newStatus });
        }
      }
    } catch (err) {
      console.error('Error toggling loan status:', err);
    }
  };

  const handleSkipInstallment = async (installmentId: string) => {
    if (!selectedLoan) return;
    try {
      const res = await fetch(`/api/v1/hr/loans/${selectedLoan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'skip_installment', installmentId }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchLoans();
        // refrescar modal
        const refreshedRes = await fetch(`/api/v1/hr/loans?employeeId=${selectedLoan.employee.id}`);
        const refJson = await refreshedRes.json();
        if (refJson.success && refJson.data) {
          const updated = refJson.data.find((l: any) => l.id === selectedLoan.id);
          if (updated) setSelectedLoan(updated);
        }
      }
    } catch (err) {
      console.error('Error skipping installment:', err);
    }
  };

  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan || !paymentAmount) return;

    setIsProcessingPayment(true);
    try {
      const res = await fetch(`/api/v1/hr/loans/${selectedLoan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_payment',
          amount: Number(paymentAmount),
          notes: paymentNotes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchLoans();
        setIsPaymentModalOpen(false);
        setPaymentAmount('');
        setPaymentNotes('');
        setSelectedLoan(null);
      }
    } catch (err) {
      console.error('Error processing manual payment:', err);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // KPIs
  const activeLoans = loans.filter((l) => l.status === 'ACTIVE');
  const totalLoaned = loans.reduce((sum, l) => sum + l.totalAmount, 0);
  const totalRemaining = loans.reduce((sum, l) => sum + l.remainingBalance, 0);
  const totalCollected = loans.reduce((sum, l) => sum + l.totalPaid, 0);

  const filteredLoans = loans.filter((l) => {
    const matchesStatus = filterStatus === 'ALL' || l.status === filterStatus;
    const empFullName = `${l.employee.firstName} ${l.employee.lastName}`.toLowerCase();
    const matchesSearch =
      empFullName.includes(searchTerm.toLowerCase()) ||
      l.loanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.employee.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Tarjetas KPI de Préstamos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-card border border-card-border rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-mono">Préstamos Activos</span>
            <Coins className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {activeLoans.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Funcionarios con cuotas vigentes</p>
        </div>

        <div className="p-4 bg-card border border-card-border rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-mono">Saldo por Cobrar</span>
            <TrendingDown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {formatCurrencyPYG(totalRemaining)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Capital pendiente de amortización</p>
        </div>

        <div className="p-4 bg-card border border-card-border rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-mono">Total Ya Cobrado</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {formatCurrencyPYG(totalCollected)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Cuotas descontadas en salarios</p>
        </div>

        <div className="p-4 bg-card border border-card-border rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-mono">Total Otorgado Histórico</span>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-400">
            {formatCurrencyPYG(totalLoaned)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Suma acumulada de préstamos</p>
        </div>
      </div>

      {/* Barra de Acciones y Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar funcionario o N° préstamo..."
              className="w-full pl-9 pr-4 py-2 bg-[#0d121c] border border-card-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex p-1 bg-[#0d121c] border border-card-border rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterStatus === 'ALL' ? 'bg-primary text-white font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('ACTIVE')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterStatus === 'ACTIVE' ? 'bg-emerald-600 text-white font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Activos
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('PAID')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterStatus === 'PAID' ? 'bg-blue-600 text-white font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Saldados
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={fetchLoans}
            className="p-2 border border-card-border rounded-lg bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Préstamo al Personal</span>
          </button>
        </div>
      </div>

      {/* Tabla de Préstamos */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b0e14] border-b border-card-border text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">N° / Funcionario</th>
                <th className="px-4 py-3">Monto Otorgado</th>
                <th className="px-4 py-3">Cuota Semanal</th>
                <th className="px-4 py-3">Progreso de Amortización</th>
                <th className="px-4 py-3">Saldo Restante</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground font-mono">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    Cargando préstamos al personal...
                  </td>
                </tr>
              ) : filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground font-mono">
                    No hay préstamos registrados con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => {
                  const percentPaid = Math.round((loan.totalPaid / loan.totalAmount) * 100) || 0;
                  return (
                    <tr key={loan.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {loan.employee.firstName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                              <span>{loan.employee.firstName} {loan.employee.lastName}</span>
                              <span className="text-[9px] font-mono bg-neutral-800 text-neutral-300 px-1.5 py-0.2 rounded border border-neutral-700">
                                {loan.loanNumber}
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {loan.employee.jobTitle} &bull; Otorgado: {new Date(loan.issueDate).toLocaleDateString('es-PY')}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        {formatCurrencyPYG(loan.totalAmount)}
                      </td>

                      <td className="px-4 py-3 font-mono text-primary font-semibold">
                        {formatCurrencyPYG(loan.installmentAmount)} / sem.
                      </td>

                      <td className="px-4 py-3 min-w-[170px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                            <span>{loan.paidInstallments} de {loan.totalInstallments} cuotas</span>
                            <span className="font-bold text-foreground">{percentPaid}%</span>
                          </div>
                          <div className="w-full bg-[#0d121c] h-2 rounded-full overflow-hidden border border-card-border">
                            <div
                              className={`h-full transition-all duration-300 ${
                                loan.status === 'PAID' ? 'bg-blue-500' : 'bg-primary'
                              }`}
                              style={{ width: `${percentPaid}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono font-bold text-amber-400">
                        {formatCurrencyPYG(loan.remainingBalance)}
                      </td>

                      <td className="px-4 py-3">
                        {loan.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                            <Clock className="w-3 h-3" />
                            <span>Vigente</span>
                          </span>
                        ) : loan.status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-blue-500/30 bg-blue-500/10 text-blue-400">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Saldado</span>
                          </span>
                        ) : loan.status === 'PAUSED' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
                            <PauseCircle className="w-3 h-3" />
                            <span>Pausado</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-muted-foreground">Cancelado</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLoan(loan)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-semibold px-2.5 py-1 rounded border border-card-border hover:border-primary/40 bg-[#0d121c] transition-colors"
                        >
                          <CalendarDays className="w-3.5 h-3.5" />
                          <span>Ver Cuotas</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Registrar Nuevo Préstamo */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 select-none">
          <div className="w-full max-w-lg bg-card border border-card-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            
            <div className="p-4 bg-[#0b0e14] border-b border-card-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Registrar Nuevo Préstamo al Personal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              {createFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    createFeedback.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      : 'bg-red-500/10 border border-red-500/30 text-red-400'
                  }`}
                >
                  {createFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{createFeedback.text}</span>
                </div>
              )}

              {/* Selector de Empleado */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>Funcionario que solicita el préstamo:</span>
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  required
                  className="w-full bg-[#0d121c] border border-card-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
                >
                  <option value="">-- Seleccione funcionario --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.code} - {emp.firstName} {emp.lastName} ({emp.jobTitle})
                    </option>
                  ))}
                </select>
              </div>

              {/* Monto Total y Cuota Semanal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                    <span>Monto Total a Prestar:</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="10000"
                      step="10000"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      placeholder="ej. 600000"
                      required
                      className="w-full bg-[#0d121c] border border-card-border rounded-lg pl-3 pr-10 py-2 text-xs font-mono font-bold text-foreground focus:outline-none focus:border-primary text-right"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground">
                      Gs.
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-primary" />
                    <span>Cuota Semanal Fija:</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="5000"
                      step="5000"
                      value={installmentAmount}
                      onChange={(e) => setInstallmentAmount(e.target.value)}
                      placeholder="ej. 100000"
                      required
                      className="w-full bg-[#0d121c] border border-card-border rounded-lg pl-3 pr-10 py-2 text-xs font-mono font-bold text-foreground focus:outline-none focus:border-primary text-right"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground">
                      Gs.
                    </span>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Resumen Automático de Cuotas */}
              {computedInstallments > 0 && (
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between font-mono font-bold text-primary">
                    <span>Plan de Amortización Automático:</span>
                    <span>{computedInstallments} semanas consecutivas</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Se descontará de forma fija <strong className="text-foreground">{formatCurrencyPYG(Number(installmentAmount))}</strong> cada sábado hasta completar los <strong className="text-foreground">{formatCurrencyPYG(Number(totalAmount))}</strong>. Tasa de interés: 0%.
                  </p>
                </div>
              )}

              {/* Fechas de Entrega y Primer Descuento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Fecha de Entrega del Dinero:</span>
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    required
                    className="w-full bg-[#0d121c] border border-card-border rounded-lg px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Primer Sábado de Descuento:</span>
                  </label>
                  <input
                    type="date"
                    value={firstDeductionDate}
                    onChange={(e) => setFirstDeductionDate(e.target.value)}
                    required
                    className="w-full bg-[#0d121c] border border-card-border rounded-lg px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Motivo */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Motivo / Destino del Préstamo (Opcional):
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="ej. Arreglo de moto / Urgencia médica / Reparación del hogar"
                  className="w-full bg-[#0d121c] border border-card-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              {/* Registro en Caja */}
              <div className="flex items-center gap-2 p-2.5 bg-[#0d121c] border border-card-border rounded-lg">
                <input
                  type="checkbox"
                  id="disbursedCashCheck"
                  checked={disbursedFromCash}
                  onChange={(e) => setDisbursedFromCash(e.target.checked)}
                  className="rounded border-card-border bg-[#07090e] text-primary focus:ring-0"
                />
                <label htmlFor="disbursedCashCheck" className="text-xs text-foreground cursor-pointer select-none">
                  El dinero se entrega en efectivo desde la Caja Central del depósito
                </label>
              </div>

              {/* Botones */}
              <div className="flex gap-2 pt-2 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2 rounded-lg border border-card-border bg-muted/20 hover:bg-muted/40 text-xs font-semibold text-muted-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Registrar Préstamo</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Ver Cronograma de Cuotas del Préstamo */}
      {selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 select-none">
          <div className="w-full max-w-xl bg-card border border-card-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Cabecera */}
            <div className="p-4 bg-[#0b0e14] border-b border-card-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span>Cronograma & Cuotas &bull; {selectedLoan.loanNumber}</span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    selectedLoan.status === 'ACTIVE'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : selectedLoan.status === 'PAID'
                      ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                  }`}>
                    {selectedLoan.status}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Funcionario: <strong className="text-foreground">{selectedLoan.employee.firstName} {selectedLoan.employee.lastName}</strong> ({selectedLoan.employee.code})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLoan(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Resumen Superior */}
            <div className="p-4 bg-[#0d121c] border-b border-card-border grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded bg-card/60 border border-card-border">
                <span className="text-[10px] text-muted-foreground block">Monto Original</span>
                <span className="font-bold text-foreground">{formatCurrencyPYG(selectedLoan.totalAmount)}</span>
              </div>
              <div className="p-2 rounded bg-card/60 border border-card-border">
                <span className="text-[10px] text-muted-foreground block">Total Ya Cobrado</span>
                <span className="font-bold text-emerald-400">{formatCurrencyPYG(selectedLoan.totalPaid)}</span>
              </div>
              <div className="p-2 rounded bg-card/60 border border-card-border">
                <span className="text-[10px] text-muted-foreground block">Saldo Restante</span>
                <span className="font-bold text-amber-400">{formatCurrencyPYG(selectedLoan.remainingBalance)}</span>
              </div>
            </div>

            {/* Lista de Cuotas Programadas */}
            <div className="p-4 max-h-72 overflow-y-auto space-y-2">
              <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Cuotas Semanales Programadas:</span>
                <span>{selectedLoan.paidInstallments} de {selectedLoan.totalInstallments} completadas</span>
              </div>

              {selectedLoan.installments.map((inst) => {
                const sDate = new Date(inst.scheduledDate).toLocaleDateString('es-PY', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                });
                return (
                  <div
                    key={inst.id}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                      inst.isDeducted
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-foreground'
                        : 'bg-[#0d121c] border-card-border text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] font-mono ${
                          inst.isDeducted
                            ? 'bg-emerald-500 text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {inst.isDeducted ? <Check className="w-3.5 h-3.5" /> : inst.installmentNumber}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <span>Cuota {inst.installmentNumber} de {selectedLoan.totalInstallments}</span>
                          <span className="font-mono text-primary font-bold">
                            {formatCurrencyPYG(inst.amount)}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          Fecha prevista: {sDate}
                          {inst.isDeducted && inst.deductedDate && (
                            <span className="text-emerald-400 ml-2">
                              &bull; Descontado el {new Date(inst.deductedDate).toLocaleDateString('es-PY')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      {inst.isDeducted ? (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          COBRADA
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSkipInstallment(inst.id)}
                          className="text-[10px] font-mono text-amber-400 hover:text-amber-300 hover:underline px-2 py-0.5"
                          title="Pausa el descuento de esta semana y corre las fechas 7 días"
                        >
                          Pausar esta semana
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pie de Acciones del Modal */}
            <div className="p-3 bg-[#0b0e14] border-t border-card-border flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleToggleStatus(selectedLoan)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-card-border text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
              >
                {selectedLoan.status === 'ACTIVE' ? (
                  <>
                    <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pausar Descuentos</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Reanudar Descuentos</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                {selectedLoan.status !== 'PAID' && (
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Abono Extraordinario</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedLoan(null)}
                  className="px-3 py-1.5 rounded-lg border border-card-border text-xs text-muted-foreground hover:text-foreground"
                >
                  Cerrar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Registrar Abono Extraordinario / Saldo Anticipado */}
      {isPaymentModalOpen && selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 select-none">
          <div className="w-full max-w-sm bg-card border border-card-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#0b0e14] border-b border-card-border flex items-center justify-between">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Registrar Abono en Efectivo</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleManualPaymentSubmit} className="p-4 space-y-3">
              <div className="p-2.5 bg-[#0d121c] border border-card-border rounded-lg text-xs space-y-1">
                <div className="text-muted-foreground">Saldo actual por cobrar:</div>
                <div className="font-mono text-base font-bold text-amber-400">
                  {formatCurrencyPYG(selectedLoan.remainingBalance)}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Monto que abona el personal (Gs.):
                </label>
                <input
                  type="number"
                  min="5000"
                  max={selectedLoan.remainingBalance}
                  step="5000"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="ej. 200000"
                  required
                  autoFocus
                  className="w-full bg-[#0d121c] border border-card-border rounded-lg px-3 py-2 text-xs font-mono font-bold text-foreground focus:outline-none focus:border-primary text-right"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Observación:
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="ej. Pago adelantado en mano"
                  className="w-full bg-[#0d121c] border border-card-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-card-border text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment || !paymentAmount}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isProcessingPayment ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Confirmar Abono</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}


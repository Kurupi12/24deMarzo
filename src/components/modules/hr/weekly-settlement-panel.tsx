'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  DollarSign,
  Printer,
  ReceiptText,
  Users,
  Search,
  PlusCircle,
  FileText,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Coins,
} from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { SettlementEmployeeData } from './weekly-receipt-a4';
import { WeeklyReceiptModal } from './weekly-receipt-modal';
import { AdvanceModal } from './advance-modal';

interface WeeklySettlementPanelProps {
  onFinanceOverdraft?: (employeeId: string, overdraftAmount: number) => void;
}

export function WeeklySettlementPanel({ onFinanceOverdraft }: WeeklySettlementPanelProps = {}) {
  // Fechas por defecto: Semana actual (Lunes a Sábado)
  const getInitialDates = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);

    return {
      start: monday.toISOString().slice(0, 10),
      end: saturday.toISOString().slice(0, 10),
    };
  };

  const initialDates = getInitialDates();
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Datos del backend
  const [settlements, setSettlements] = useState<SettlementEmployeeData[]>([]);
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    totalWeeklySalary: 0,
    totalAdvances: 0,
    totalLoans: 0,
    totalDeductions: 0,
    totalNetPayable: 0,
  });

  // Modales
  const [selectedSettlementForReceipt, setSelectedSettlementForReceipt] = useState<SettlementEmployeeData | null>(null);
  const [selectedEmployeeForAdvance, setSelectedEmployeeForAdvance] = useState<any | null>(null);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);

  // Consulta de liquidación semanal
  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/v1/hr/settlements?startDate=${startDate}&endDate=${endDate}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSettlements(json.data.settlements || []);
        setSummary(json.data.summary || {
          totalEmployees: 0,
          totalWeeklySalary: 0,
          totalAdvances: 0,
          totalNetPayable: 0,
        });
      } else {
        setErrorMsg(json.error?.message || 'Error al obtener la liquidación semanal');
      }
    } catch {
      setErrorMsg('No se pudo conectar con el servidor para calcular las liquidaciones.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  // Accesos rápidos de fechas
  const setThisWeek = () => {
    const dates = getInitialDates();
    setStartDate(dates.start);
    setEndDate(dates.end);
  };

  const setLastWeek = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday - 7);

    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);

    setStartDate(monday.toISOString().slice(0, 10));
    setEndDate(saturday.toISOString().slice(0, 10));
  };

  // Filtrado por buscador
  const filteredSettlements = settlements.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.documentNumber.includes(q) ||
      s.jobTitle.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* ================= BARRA DE FILTROS POR FECHA ================= */}
      <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-foreground">
              Periodo de Liquidación Semanal
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={setThisWeek}
              className="px-2.5 py-1 rounded bg-[#0d121c] border border-card-border hover:border-primary text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              Esta Semana (Lun - Sáb)
            </button>
            <button
              type="button"
              onClick={setLastWeek}
              className="px-2.5 py-1 rounded bg-[#0d121c] border border-card-border hover:border-primary text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              Semana Pasada
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-4">
            <label className="text-[11px] font-mono font-semibold text-sky-300 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>Fecha Desde (Lunes):</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-[#0d121c] border border-card-border hover:border-sky-500/50 rounded-md px-3 py-1.5 font-mono text-foreground text-xs focus:outline-none focus:border-sky-400 transition-colors"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="text-[11px] font-mono font-semibold text-sky-300 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>Fecha Hasta (Sábado / Cierre):</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-[#0d121c] border border-card-border hover:border-sky-500/50 rounded-md px-3 py-1.5 font-mono text-foreground text-xs focus:outline-none focus:border-sky-400 transition-colors"
            />
          </div>

          <div className="sm:col-span-4">
            <button
              type="button"
              onClick={fetchSettlements}
              disabled={loading}
              className="w-full py-2 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-md transition-colors flex items-center justify-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{loading ? 'Calculando Liquidación...' : 'Calcular Periodo'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= TARJETAS RESUMEN DE LA SEMANA ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-card border border-card-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Nómina Salarial Semanal</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground">
            {formatCurrencyPYG(summary.totalWeeklySalary)}
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">
            {summary.totalEmployees} colaboradores en plantilla
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-card-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Deducciones (Vales & Préstamos)</span>
            <ReceiptText className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl font-bold font-mono text-red-400">
            -{formatCurrencyPYG(summary.totalDeductions || (summary.totalAdvances + (summary.totalLoans || 0)))}
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">
            Vales: {formatCurrencyPYG(summary.totalAdvances)} | Cuotas: {formatCurrencyPYG(summary.totalLoans || 0)}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-card-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Neto Total a Desembolsar</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {formatCurrencyPYG(summary.totalNetPayable)}
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">
            Efectivo real para el pago de haberes
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ================= TABLA DETALLADA POR FUNCIONARIO ================= */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden flex flex-col">
        {/* Barra de búsqueda de funcionario */}
        <div className="p-3 bg-[#0d121c] border-b border-card-border flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre, cargo o cédula..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-card-border rounded-md pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-sans"
            />
          </div>

          <div className="text-xs text-muted-foreground font-mono">
            Mostrando <strong>{filteredSettlements.length}</strong> de {settlements.length} funcionarios
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#090d16] border-b border-card-border text-[11px] font-mono uppercase text-muted-foreground">
              <tr>
                <th className="py-2.5 px-3">Legajo</th>
                <th className="py-2.5 px-3">Funcionario</th>
                <th className="py-2.5 px-3">Cargo</th>
                <th className="py-2.5 px-3 text-right">Salario Semanal</th>
                <th className="py-2.5 px-3 text-right">Deducciones (Vales & Cuotas)</th>
                <th className="py-2.5 px-3 text-right">Neto a Cobrar</th>
                <th className="py-2.5 px-3 text-center">Recibo & Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border font-mono text-muted-foreground">
              {filteredSettlements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground font-mono">
                    No se encontraron funcionarios activos para el periodo seleccionado.
                  </td>
                </tr>
              ) : (
                filteredSettlements.map((emp) => {
                  const hasAdvances = emp.advances && emp.advances.length > 0;
                  const hasLoans = emp.loanDeductions && emp.loanDeductions.length > 0;
                  const totalDeductions = emp.totalDeductions ?? (emp.totalAdvances + (emp.totalLoans || 0));
                  const isExpanded = expandedEmployeeId === emp.id;

                  return (
                    <React.Fragment key={emp.id}>
                      <tr className="hover:bg-muted/10 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-foreground">{emp.code}</td>
                        <td className="py-2.5 px-3 font-sans">
                          <div className="font-semibold text-foreground">
                            {emp.lastName}, {emp.firstName}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            C.I.: {emp.documentNumber}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-foreground">
                          {emp.jobTitle}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-foreground">
                          {formatCurrencyPYG(emp.weeklySalary)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {totalDeductions > 0 ? (
                            <button
                              type="button"
                              onClick={() => setExpandedEmployeeId(isExpanded ? null : emp.id)}
                              className="inline-flex items-center gap-1.5 text-red-400 font-bold hover:underline"
                              title="Ver desglose de vales y cuotas de préstamos"
                            >
                              <span>-{formatCurrencyPYG(totalDeductions)}</span>
                              <div className="flex items-center gap-1">
                                {hasAdvances && (
                                  <span className="text-[10px] px-1 py-0.2 rounded bg-red-500/20 text-red-300 font-mono">
                                    V:{emp.advances.length}
                                  </span>
                                )}
                                {hasLoans && (
                                  <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono flex items-center gap-0.5">
                                    <Coins className="w-2.5 h-2.5" />
                                    <span>P:{emp.loanDeductions!.length}</span>
                                  </span>
                                )}
                              </div>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          ) : (
                            <span className="text-neutral-500 text-[11px]">0 Gs.</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`text-sm font-black ${
                            emp.isOverdrawn ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {formatCurrencyPYG(emp.netPayable)}
                          </span>
                          {emp.isOverdrawn && emp.overdraftAmount && emp.overdraftAmount > 0 && (
                            <div className="text-[10px] font-mono text-rose-400 font-bold whitespace-nowrap mt-0.5">
                              Sobregiro: -{formatCurrencyPYG(emp.overdraftAmount)}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setSelectedSettlementForReceipt(emp)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary hover:bg-primary-hover text-white text-[11px] font-semibold transition-colors shadow-sm"
                              title="Generar e imprimir recibo A4 en duplicado"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Recibo A4</span>
                            </button>

                            {emp.isOverdrawn && onFinanceOverdraft && (
                              <button
                                type="button"
                                onClick={() => onFinanceOverdraft(emp.id, emp.overdraftAmount || 0)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 text-purple-300 text-[11px] font-semibold transition-colors shadow-sm"
                                title="Financiar sobregiro en cuotas (sin egreso de caja)"
                              >
                                <Coins className="w-3 h-3 text-purple-400" />
                                <span>Financiar Sobregiro</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedEmployeeForAdvance({
                                id: emp.id,
                                code: emp.code,
                                firstName: emp.firstName,
                                lastName: emp.lastName,
                                salaryStructure: { weeklySalary: emp.weeklySalary },
                              })}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#0d121c] border border-card-border hover:border-accent text-accent hover:bg-accent/10 text-[11px] font-medium transition-colors"
                              title="Cargar nuevo vale para este personal"
                            >
                              <PlusCircle className="w-3 h-3" />
                              <span>+ Vale</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Desglose desplegable de Vales diarios y Cuotas de Préstamos */}
                      {isExpanded && (hasAdvances || hasLoans) && (
                        <tr className="bg-[#090d16] border-y border-dashed border-red-500/20">
                          <td colSpan={7} className="py-3 px-6 space-y-3">
                            {hasAdvances && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider block">
                                  Vales Retirados en la Semana:
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                                  {emp.advances.map((adv) => {
                                    const advDate = new Date(adv.requestDate);
                                    const dFmt = advDate.toLocaleDateString('es-PY', {
                                      weekday: 'short',
                                      day: '2-digit',
                                      month: '2-digit',
                                    });
                                    return (
                                      <div
                                        key={adv.id}
                                        className="p-2 rounded bg-card border border-card-border text-[11px] font-mono flex items-center justify-between"
                                      >
                                        <div>
                                          <span className="font-bold text-foreground capitalize">{dFmt}: </span>
                                          <span className="text-muted-foreground font-sans text-[10px]">{adv.reason}</span>
                                        </div>
                                        <span className="font-bold text-red-400 ml-2">
                                          -{formatCurrencyPYG(adv.amount)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {hasLoans && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <Coins className="w-3 h-3" />
                                  <span>Cuotas de Préstamos Semanales:</span>
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                                  {emp.loanDeductions!.map((loan) => (
                                    <div
                                      key={loan.installmentId}
                                      className="p-2.5 rounded bg-card border border-amber-500/30 text-[11px] font-mono flex flex-col justify-between space-y-1"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-amber-300">
                                          {loan.loanNumber} (Cuota {loan.installmentNumber}/{loan.totalInstallments})
                                        </span>
                                        <span className="font-bold text-amber-400">
                                          -{formatCurrencyPYG(loan.amount)}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-muted-foreground font-sans flex items-center justify-between">
                                        <span>Saldo rest. tras cuota:</span>
                                        <span className="font-mono text-foreground font-semibold">
                                          {formatCurrencyPYG(loan.remainingBalance)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL DE RECIBO A4 IMPRIMIBLE ================= */}
      {selectedSettlementForReceipt && (
        <WeeklyReceiptModal
          settlement={selectedSettlementForReceipt}
          period={{ startDate, endDate }}
          isOpen={!!selectedSettlementForReceipt}
          onClose={() => setSelectedSettlementForReceipt(null)}
        />
      )}

      {/* ================= MODAL DE CARGA RÁPIDA DE VALES ================= */}
      {selectedEmployeeForAdvance && (
        <AdvanceModal
          employee={selectedEmployeeForAdvance}
          isOpen={!!selectedEmployeeForAdvance}
          onClose={() => setSelectedEmployeeForAdvance(null)}
          onAdvanceCreated={() => {
            fetchSettlements();
          }}
        />
      )}
    </div>
  );
}


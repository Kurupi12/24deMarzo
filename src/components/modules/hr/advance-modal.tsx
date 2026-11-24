'use client';

import React, { useState, useEffect } from 'react';
import { X, DollarSign, AlertCircle, Calendar, Landmark } from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { DateInputPY } from '@/components/common/date-input-py';

interface AdvanceModalProps {
  employee: {
    id: string;
    code: string;
    firstName: string;
    lastName: string;
    salaryStructure: { weeklySalary: string | number } | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onAdvanceCreated: () => void;
}

export function AdvanceModal({ employee, isOpen, onClose, onAdvanceCreated }: AdvanceModalProps) {
  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const currentPeriod = todayStr.slice(0, 7); // YYYY-MM
  const [requestDate, setRequestDate] = useState(todayStr);
  const [amount, setAmount] = useState('');
  const [deductionPeriod, setDeductionPeriod] = useState(currentPeriod);
  const [reason, setReason] = useState('');
  const [isCashShiftOpen, setIsCashShiftOpen] = useState<boolean | null>(null);
  const [deductFromCashShift, setDeductFromCashShift] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/v1/billing/shifts')
      .then((res) => res.json())
      .then((json) => {
        const open = !!json?.data?.currentShift;
        setIsCashShiftOpen(open);
        setDeductFromCashShift(open && requestDate === todayStr);
      })
      .catch(() => {
        setIsCashShiftOpen(false);
        setDeductFromCashShift(false);
      });
  }, [isOpen, requestDate, todayStr]);

  if (!isOpen || !employee) return null;

  const weeklySalary = Number(employee.salaryStructure?.weeklySalary || 0);
  const parsedAmount = parseFloat(amount) || 0;
  const isOverdraft = weeklySalary > 0 && parsedAmount > weeklySalary;
  const overdraftDiff = isOverdraft ? parsedAmount - weeklySalary : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      setErrorMsg('Debe ingresar un monto válido mayor a 0');
      return;
    }

    if (!reason.trim()) {
      setErrorMsg('Por favor indique el motivo del adelanto / vale.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/v1/hr/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          amount: val,
          requestDate,
          deductionPeriod,
          reason: reason.trim() || undefined,
          deductFromCashShift,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onAdvanceCreated();
        onClose();
      } else {
        setErrorMsg(data.error?.message || 'Error al procesar adelanto');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-card border border-card-border rounded-lg w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-card-border pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Solicitud de Adelanto Salarial</h3>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 rounded-md bg-[#0d121c] border border-card-border space-y-1 text-xs">
          <p className="font-semibold text-foreground">{employee.firstName} {employee.lastName} ({employee.code})</p>
          <div className="flex justify-between items-center text-muted-foreground font-mono text-[11px]">
            <span>Salario Semanal: <strong className="text-foreground">{formatCurrencyPYG(weeklySalary)}</strong></span>
            <span className="text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              Límite 100% de Salario
            </span>
          </div>
        </div>

        {isOverdraft && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="space-y-0.5">
              <strong className="block text-amber-200">Aviso de Sobregiro ({formatCurrencyPYG(parsedAmount)})</strong>
              <p className="text-[11px] text-amber-300/90 leading-tight">
                Este vale supera el 100% del salario semanal por <strong className="text-foreground font-mono font-bold">+{formatCurrencyPYG(overdraftDiff)}</strong>. Se registrará como sobregiro y podrá ser financiado en cuotas en la Liquidación Semanal.
              </p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 rounded bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 font-sans text-xs">
          {/* Fecha del Adelanto / Retroactiva */}
          <div className="p-2.5 rounded-lg bg-[#0d121c] border border-card-border space-y-1">
            <label className="text-[11px] font-mono font-semibold text-sky-300 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>Fecha del Adelanto / Vale *</span>
            </label>
            <DateInputPY
              required
              value={requestDate}
              onChange={(val) => {
                setRequestDate(val);
                if (val) {
                  setDeductionPeriod(val.slice(0, 7));
                }
              }}
              className="bg-card border border-card-border hover:border-sky-500/50 rounded px-2.5 py-1.5 text-foreground focus:outline-none focus:border-sky-400 text-xs transition-colors"
            />
            <p className="text-[10px] text-muted-foreground font-sans">
              Por defecto carga la fecha de hoy, pero puedes seleccionar una fecha anterior (ej. lunes) si estás cargando el vale después.
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-mono text-muted-foreground">Monto Solicitado (₲) *</label>
              {parsedAmount > 0 && (
                <span className="text-[11px] font-mono font-bold text-accent">
                  {formatCurrencyPYG(parsedAmount)}
                </span>
              )}
            </div>
            <input
              type="number"
              required
              min="1000"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onFocus={(e) => e.target.select()}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              placeholder={weeklySalary > 0 ? `Hasta 100%: ${weeklySalary}` : 'ej. 200000'}
              className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground focus:outline-none focus:border-accent"
            />
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] font-mono text-muted-foreground">Comunes:</span>
              {[50000, 100000, 200000, 300000, 500000, 700000]
                .filter((amt) => !weeklySalary || amt <= weeklySalary * 1.5)
                .map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(String(amt))}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0d121c] hover:bg-card border border-card-border hover:border-accent text-muted-foreground hover:text-accent transition-colors"
                  >
                    {formatCurrencyPYG(amt)}
                  </button>
                ))}
              {weeklySalary > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(weeklySalary))}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 font-bold transition-colors"
                  title="Cargar el 100% del salario semanal"
                >
                  100% ({formatCurrencyPYG(weeklySalary)})
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-foreground mb-1">
              Motivo del Adelanto / Vale *
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indique por qué retira el vale (ej: Combustible, Médico, Despensa...)"
              className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-accent text-xs"
            />
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] font-mono text-muted-foreground">Motivos rápidos:</span>
              {['Gastos personales', 'Combustible', 'Despensa / Comida', 'Salud / Médico', 'Pasaje', 'Urgencia familiar'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                    reason === preset
                      ? 'bg-accent/20 border-accent text-accent font-bold'
                      : 'bg-[#0d121c] hover:bg-card border-card-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-muted-foreground mb-1">Período Fiscal de Deducción *</label>
            <input
              type="month"
              required
              value={deductionPeriod}
              onChange={(e) => setDeductionPeriod(e.target.value)}
              className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground focus:outline-none focus:border-accent"
            />
          </div>

          <div className="p-2.5 rounded-lg bg-[#0d121c] border border-card-border space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono font-semibold text-foreground flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-primary" />
                <span>¿Descontar de Caja del Día?</span>
              </span>
              {isCashShiftOpen === false && (
                <span className="text-[10px] font-mono text-amber-300">Caja cerrada actualmente</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
              <button
                type="button"
                disabled={isCashShiftOpen === false}
                onClick={() => setDeductFromCashShift(true)}
                className={`py-1.5 px-2 rounded border transition-colors text-center disabled:opacity-40 ${
                  deductFromCashShift
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-card border-card-border text-muted-foreground hover:text-foreground'
                }`}
              >
                Sí, Efectivo de Caja
              </button>
              <button
                type="button"
                onClick={() => setDeductFromCashShift(false)}
                className={`py-1.5 px-2 rounded border transition-colors text-center ${
                  !deductFromCashShift
                    ? 'bg-primary/20 border-primary text-primary font-bold'
                    : 'bg-card border-card-border text-muted-foreground hover:text-foreground'
                }`}
              >
                No (Fuera de Caja)
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-card-border">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md border border-card-border text-xs text-muted-foreground hover:text-foreground">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-3 py-1.5 rounded-md text-white text-xs font-semibold disabled:opacity-50 transition-colors ${
                isOverdraft
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-accent hover:bg-accent/80'
              }`}
            >
              {loading
                ? 'Procesando...'
                : isOverdraft
                ? 'Aprobar Vale con Sobregiro'
                : 'Aprobar y Registrar Adelanto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


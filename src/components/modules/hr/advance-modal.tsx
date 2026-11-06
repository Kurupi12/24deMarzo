'use client';

import React, { useState } from 'react';
import { X, DollarSign, AlertCircle } from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';

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
  const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [amount, setAmount] = useState('');
  const [deductionPeriod, setDeductionPeriod] = useState(currentPeriod);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !employee) return null;

  const weeklySalary = Number(employee.salaryStructure?.weeklySalary || 0);
  const maxAllowed = Math.round(weeklySalary * 0.7);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) return;

    if (val > maxAllowed) {
      setErrorMsg(`El monto supera el tope máximo permitido de ₲ ${maxAllowed.toLocaleString('es-PY')}`);
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
          deductionPeriod,
          reason: reason.trim() || undefined,
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
          <div className="flex justify-between text-muted-foreground font-mono text-[11px]">
            <span>Salario Semanal: {formatCurrencyPYG(weeklySalary)}</span>
            <span className="text-accent font-semibold">Tope (70%): {formatCurrencyPYG(maxAllowed)}</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 font-sans text-xs">
          <div>
            <label className="block text-[11px] font-mono text-muted-foreground mb-1">Monto Solicitado (₲) *</label>
            <input
              type="number"
              required
              min="1000"
              max={maxAllowed}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onFocus={(e) => e.target.select()}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              placeholder={`Máximo: ${maxAllowed}`}
              className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground focus:outline-none focus:border-accent"
            />
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] font-mono text-muted-foreground">Comunes:</span>
              {[100000, 200000, 300000, 500000].filter(amt => amt <= maxAllowed).map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(String(amt))}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0d121c] hover:bg-card border border-card-border hover:border-accent text-muted-foreground hover:text-accent transition-colors"
                >
                  {formatCurrencyPYG(amt)}
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

          <div>
            <label className="block text-[11px] font-mono text-muted-foreground mb-1">Motivo / Concepto</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Gastos personales / médicos..."
              className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-card-border">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md border border-card-border text-xs text-muted-foreground hover:text-foreground">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-3 py-1.5 rounded-md bg-accent hover:bg-accent/80 text-white text-xs font-medium disabled:opacity-50">
              {loading ? 'Procesando...' : 'Aprobar y Registrar Adelanto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


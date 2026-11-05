'use client';

import React, { useState, useEffect } from 'react';
import { Landmark, Lock, Unlock, DollarSign, AlertCircle } from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';

export function CashShiftPanel() {
  const [shiftData, setShiftData] = useState<any>(null);
  const [openingBalance, setOpeningBalance] = useState('200000');
  const [closingBalance, setClosingBalance] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchShift = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/billing/shifts');
      const json = await res.json();
      if (json.success) setShiftData(json.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShift();
  }, []);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/v1/billing/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'OPEN', openingBalance: parseFloat(openingBalance) || 0 }),
      });
      fetchShift();
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftData?.currentShift) return;
    setLoading(true);
    try {
      await fetch('/api/v1/billing/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLOSE',
          shiftId: shiftData.currentShift.id,
          closingBalance: parseFloat(closingBalance) || 0,
        }),
      });
      setClosingBalance('');
      fetchShift();
    } finally {
      setLoading(false);
    }
  };

  const currentShift = shiftData?.currentShift;

  return (
    <div className="bg-card border border-card-border rounded-lg p-5 space-y-4 max-w-xl">
      <div className="flex items-center justify-between border-b border-card-border pb-3">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Control de Turnos de Caja Mostrador</h3>
            <p className="text-[10px] text-muted-foreground font-mono">{shiftData?.register?.name || 'Caja Central 01'}</p>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
          currentShift ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-danger/10 text-danger border border-danger/20'
        }`}>
          {currentShift ? 'Turno Abierto' : 'Caja Cerrada'}
        </span>
      </div>

      {currentShift ? (
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-[#0d121c] border border-card-border font-mono text-xs space-y-2">
            <div className="flex justify-between text-muted-foreground">
              <span>Fondo Fijo Inicial:</span>
              <span className="text-foreground">{formatCurrencyPYG(Number(currentShift.openingBalance))}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Ventas en este turno:</span>
              <span className="text-primary font-bold">{currentShift.sales?.length || 0} tickets</span>
            </div>
          </div>

          <form onSubmit={handleCloseShift} className="space-y-3 font-sans text-xs">
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Monto en Efectivo de Arqueo (₲) *</label>
              <input
                type="number"
                required
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
                placeholder="Ingrese total físico contado en caja..."
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground focus:outline-none focus:border-danger"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded bg-danger hover:bg-danger/80 text-white font-medium text-xs flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Realizar Arqueo y Cerrar Turno</span>
            </button>
          </form>
        </div>
      ) : (
        <form onSubmit={handleOpenShift} className="space-y-3 font-sans text-xs">
          <div>
            <label className="block text-[11px] font-mono text-muted-foreground mb-1">Monto de Apertura / Cambio Inicial (₲) *</label>
            <input
              type="number"
              required
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded bg-primary hover:bg-primary-hover text-white font-medium text-xs flex items-center justify-center gap-2"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Abrir Turno de Caja</span>
          </button>
        </form>
      )}
    </div>
  );
}


'use client';

import React from 'react';
import { Banknote, Coins, RotateCcw, Plus } from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';

export interface CashDenominations {
  b100k: number;
  b50k: number;
  b20k: number;
  b10k: number;
  b5k: number;
  b2k: number;
  m1k: number;
  m500: number;
  m100: number;
  m50: number;
}

export const INITIAL_DENOMINATIONS: CashDenominations = {
  b100k: 0,
  b50k: 0,
  b20k: 0,
  b10k: 0,
  b5k: 0,
  b2k: 0,
  m1k: 0,
  m500: 0,
  m100: 0,
  m50: 0,
};

export const BILL_DENOMINATIONS = [
  { key: 'b100k' as const, label: 'Gs. 100.000', value: 100000, tag: 'San Roque González', badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { key: 'b50k' as const, label: 'Gs. 50.000', value: 50000, tag: 'Agustín Pío Barrios', badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { key: 'b20k' as const, label: 'Gs. 20.000', value: 20000, tag: 'Mujer Paraguaya', badgeColor: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  { key: 'b10k' as const, label: 'Gs. 10.000', value: 10000, tag: 'Dr. Francia', badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { key: 'b5k' as const, label: 'Gs. 5.000', value: 5000, tag: 'C. A. López', badgeColor: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  { key: 'b2k' as const, label: 'Gs. 2.000', value: 2000, tag: 'Adela y Celsa Speratti', badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
];

export const COIN_DENOMINATIONS = [
  { key: 'm1k' as const, label: 'Gs. 1.000', value: 1000, tag: 'Panteón', badgeColor: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  { key: 'm500' as const, label: 'Gs. 500', value: 500, tag: 'Gral. Díaz', badgeColor: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  { key: 'm100' as const, label: 'Gs. 100', value: 100, tag: 'Humaitá', badgeColor: 'bg-slate-600/15 text-slate-400 border-slate-600/30' },
  { key: 'm50' as const, label: 'Gs. 50', value: 50, tag: 'José F. Estigarribia', badgeColor: 'bg-slate-700/15 text-slate-400 border-slate-700/30' },
];

export function calculateBreakdownTotals(values: CashDenominations) {
  const billsTotal =
    (values.b100k || 0) * 100000 +
    (values.b50k || 0) * 50000 +
    (values.b20k || 0) * 20000 +
    (values.b10k || 0) * 10000 +
    (values.b5k || 0) * 5000 +
    (values.b2k || 0) * 2000;

  const coinsTotal =
    (values.m1k || 0) * 1000 +
    (values.m500 || 0) * 500 +
    (values.m100 || 0) * 100 +
    (values.m50 || 0) * 50;

  const totalPieces = Object.values(values).reduce((sum, val) => sum + (Number(val) || 0), 0);

  return {
    billsTotal,
    coinsTotal,
    grandTotal: billsTotal + coinsTotal,
    totalPieces,
  };
}

interface BanknoteCounterProps {
  values: CashDenominations;
  onChange: (newValues: CashDenominations) => void;
  compact?: boolean;
}

export function BanknoteCounter({ values, onChange, compact = false }: BanknoteCounterProps) {
  const handleQtyChange = (key: keyof CashDenominations, valStr: string) => {
    const parsed = parseInt(valStr, 10);
    const safeVal = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    onChange({
      ...values,
      [key]: safeVal,
    });
  };

  const handleIncrement = (key: keyof CashDenominations, step: number) => {
    const current = values[key] || 0;
    onChange({
      ...values,
      [key]: Math.max(0, current + step),
    });
  };

  const handleReset = () => {
    onChange({ ...INITIAL_DENOMINATIONS });
  };

  const { billsTotal, coinsTotal, grandTotal, totalPieces } = calculateBreakdownTotals(values);

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Barra de cabecera con botón de limpiar */}
      <div className="flex items-center justify-between pb-2 border-b border-card-border">
        <div className="flex items-center gap-2">
          <Banknote className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-foreground font-sans">
            Calculadora de Billetaje & Monedas (PYG)
          </span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#0d121c] border border-card-border text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          title="Reiniciar conteo a cero"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Limpiar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* COLUMNA 1: BILLETES */}
        <div className="bg-[#0d121c] border border-card-border rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between border-b border-card-border pb-1.5 text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-foreground">
              <Banknote className="w-3.5 h-3.5 text-emerald-400" /> Billetes
            </span>
            <span className="text-[11px] text-emerald-400 font-bold">{formatCurrencyPYG(billsTotal)}</span>
          </div>

          <div className="space-y-2">
            {BILL_DENOMINATIONS.map((item) => {
              const qty = values[item.key] || 0;
              const subtotal = qty * item.value;
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-2 p-1.5 rounded bg-card/60 border border-card-border/80 hover:border-card-border transition-colors"
                >
                  <div className="w-28 shrink-0">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${item.badgeColor}`}>
                      {item.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={qty === 0 ? '' : qty}
                      onChange={(e) => handleQtyChange(item.key, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      placeholder="0"
                      className="w-16 h-7 text-center font-bold bg-[#0d121c] border border-card-border rounded px-1 text-xs text-foreground focus:outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {!compact && (
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleIncrement(item.key, 1)}
                          className="h-7 w-6 flex items-center justify-center rounded bg-card border border-card-border hover:bg-muted/40 text-[10px] text-muted-foreground hover:text-foreground"
                          title="Sumar 1"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleIncrement(item.key, 5)}
                          className="h-7 w-6 flex items-center justify-center rounded bg-card border border-card-border hover:bg-muted/40 text-[10px] text-muted-foreground hover:text-foreground"
                          title="Sumar 5"
                        >
                          +5
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="w-24 text-right">
                    <span className={`text-[11px] font-bold ${qty > 0 ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                      {formatCurrencyPYG(subtotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMNA 2: MONEDAS */}
        <div className="bg-[#0d121c] border border-card-border rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between border-b border-card-border pb-1.5 text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-foreground">
              <Coins className="w-3.5 h-3.5 text-yellow-400" /> Monedas
            </span>
            <span className="text-[11px] text-yellow-400 font-bold">{formatCurrencyPYG(coinsTotal)}</span>
          </div>

          <div className="space-y-2">
            {COIN_DENOMINATIONS.map((item) => {
              const qty = values[item.key] || 0;
              const subtotal = qty * item.value;
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-2 p-1.5 rounded bg-card/60 border border-card-border/80 hover:border-card-border transition-colors"
                >
                  <div className="w-28 shrink-0">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${item.badgeColor}`}>
                      {item.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={qty === 0 ? '' : qty}
                      onChange={(e) => handleQtyChange(item.key, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      placeholder="0"
                      className="w-16 h-7 text-center font-bold bg-[#0d121c] border border-card-border rounded px-1 text-xs text-foreground focus:outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {!compact && (
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleIncrement(item.key, 1)}
                          className="h-7 w-6 flex items-center justify-center rounded bg-card border border-card-border hover:bg-muted/40 text-[10px] text-muted-foreground hover:text-foreground"
                          title="Sumar 1"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleIncrement(item.key, 5)}
                          className="h-7 w-6 flex items-center justify-center rounded bg-card border border-card-border hover:bg-muted/40 text-[10px] text-muted-foreground hover:text-foreground"
                          title="Sumar 5"
                        >
                          +5
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="w-24 text-right">
                    <span className={`text-[11px] font-bold ${qty > 0 ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                      {formatCurrencyPYG(subtotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* TOTALIZADOR GENERAL */}
      <div className="p-3 rounded-lg bg-card border-2 border-primary/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Billetes: <strong className="text-foreground">{formatCurrencyPYG(billsTotal)}</strong></span>
          <span>&bull;</span>
          <span>Monedas: <strong className="text-foreground">{formatCurrencyPYG(coinsTotal)}</strong></span>
          <span>&bull;</span>
          <span>Piezas: <strong className="text-foreground">{totalPieces}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Total Físico Contado:
          </span>
          <span className="text-base font-bold text-emerald-400 bg-[#0d121c] px-3 py-1 rounded border border-emerald-500/30">
            {formatCurrencyPYG(grandTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { MoreHorizontal, ArrowUpRight, ArrowDownRight, Target, CheckCircle2, TrendingUp } from 'lucide-react';
import { SalesChannelBreakdown } from '@/modules/dashboard/types/dashboard.types';

interface PortfolioBreakdownCardProps {
  channels?: SalesChannelBreakdown;
  targetPercent?: number;
}

export function PortfolioBreakdownCard({
  channels,
  targetPercent = 75.8,
}: PortfolioBreakdownCardProps) {
  const items = [
    {
      label: 'Ventas Mostrador (Contado)',
      sub: 'Cobros inmediatos en efectivo terminal POS',
      color: 'bg-danger',
      barColor: '#ef4444',
      amount: channels?.counterCash?.amount || 47250000,
      growth: channels?.counterCash?.growth || 25.6,
      pct: 55,
    },
    {
      label: 'Ventas a Crédito (SIFEN)',
      sub: 'Facturación a plazo con remisión oficial',
      color: 'bg-warning',
      barColor: '#f59e0b',
      amount: channels?.invoicedCredit?.amount || 25600000,
      growth: channels?.invoicedCredit?.growth || -10.9,
      pct: 30,
    },
    {
      label: 'Cobranzas & Medios Digitales',
      sub: 'Transferencias bancarias SIPAP & POS electrónico',
      color: 'bg-primary',
      barColor: '#00d2ff',
      amount: channels?.electronicPayments?.amount || 12550000,
      growth: channels?.electronicPayments?.growth || 12.3,
      pct: 15,
    },
  ];

  // Cálculo para el Gran Medidor Radial SVG (Escala Ampliada de Gran Impacto)
  const radius = 95;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  // Semicírculo de 200 grados
  const arcLength = circumference * (200 / 360);
  const strokeDashoffset = arcLength - (arcLength * targetPercent) / 100;

  // Cifras de metas para el panel de telemetría
  const monthlyGoal = 112500000;
  const achievedAmount = Math.round(monthlyGoal * (targetPercent / 100));
  const remainingAmount = monthlyGoal - achievedAmount;

  return (
    <div className="bg-card border border-card-border rounded-xl p-6 flex flex-col justify-between shadow-xl">
      {/* 1. Cabecera */}
      <div className="flex items-center justify-between border-b border-card-border pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-wide font-mono">
            Desglose de Ingresos & Rendimiento
          </h3>
          <p className="text-[11px] text-muted-foreground font-sans">
            Distribución por canales y monitoreo de meta fiscal
          </p>
        </div>
        <button
          type="button"
          aria-label="Más opciones"
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Lista de Canales con barras de progreso */}
      <div className="space-y-3.5 my-4">
        {items.map((item, idx) => {
          const isUp = item.growth >= 0;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className={`w-1 h-8 rounded-full ${item.color} mt-0.5 shrink-0`} />
                  <div>
                    <h4 className="font-semibold text-foreground tracking-tight">{item.label}</h4>
                    <p className="text-[11px] text-muted-foreground leading-tight">{item.sub}</p>
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono">
                  <span className="font-bold text-foreground text-xs block">
                    {formatCurrencyPYG(item.amount)}
                  </span>
                  <span
                    className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
                      isUp ? 'text-emerald-400' : 'text-danger'
                    }`}
                  >
                    {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {isUp ? '+' : ''}
                    {item.growth}%
                  </span>
                </div>
              </div>

              {/* Barra de proporción por canal */}
              <div className="h-1.5 w-full bg-[#090d16] rounded-full overflow-hidden border border-card-border">
                <div
                  style={{ width: `${item.pct}%`, backgroundColor: item.barColor }}
                  className="h-full rounded-full transition-all duration-700"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. MÓDULO REDIAGRAMADO Y AMPLIADO: Medidor Radial de Gran Escala + Panel de Metas */}
      <div className="border-t border-card-border pt-4 bg-[#090d16]/70 rounded-xl p-5 border border-card-border/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Target className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-foreground font-mono uppercase tracking-wider">
              Control de Meta Mensual
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
            En Ritmo Óptimo
          </span>
        </div>

        {/* Medidor Radial Grande de Alta Definición */}
        <div className="relative w-full flex flex-col items-center justify-center">
          <div className="relative w-64 h-40 flex items-center justify-center">
            <svg className="w-full h-full -rotate-[190deg] overflow-visible" viewBox="0 0 240 240">
              <defs>
                {/* Degradado multicolor cian -> esmeralda -> púrpura */}
                <linearGradient id="gaugeGradientLarge" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#00d2ff" />
                  <stop offset="55%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>

                {/* Patrón rayado interior estilo foto de referencia */}
                <pattern id="diagonalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#10b981" strokeWidth="2.5" opacity="0.3" />
                </pattern>
              </defs>

              {/* Anillo de relleno con textura rayada verde como en la foto */}
              <circle
                cx="120"
                cy="120"
                r={radius - 18}
                fill="url(#diagonalHatch)"
                stroke="#10b981"
                strokeWidth="1.5"
                opacity="0.4"
              />

              {/* Pista de fondo oscura */}
              <circle
                cx="120"
                cy="120"
                r={radius}
                fill="none"
                stroke="#1e2638"
                strokeWidth={strokeWidth}
                strokeDasharray={`${arcLength} ${circumference}`}
                strokeLinecap="round"
              />

              {/* Arco principal grueso y vibrante */}
              <circle
                cx="120"
                cy="120"
                r={radius}
                fill="none"
                stroke="url(#gaugeGradientLarge)"
                strokeWidth={strokeWidth}
                strokeDasharray={`${arcLength} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />

              {/* Anillo exterior decorativo segmentado */}
              <circle
                cx="120"
                cy="120"
                r={radius + 14}
                fill="none"
                stroke="#334155"
                strokeWidth="1.5"
                strokeDasharray="3 6"
                opacity="0.6"
              />
            </svg>

            {/* Cifra Central en Tamaño Grande */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
              <span className="text-4xl font-black font-mono text-foreground tracking-tight">
                {targetPercent}%
              </span>
              <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                <CheckCircle2 className="w-3 h-3" /> Meta Mensual
              </span>
            </div>
          </div>
        </div>

        {/* Panel Inferior de Telemetría Financiera (Elimina el espacio vacío con datos útiles) */}
        <div className="grid grid-cols-3 gap-2 border-t border-card-border/80 pt-3 text-center font-mono">
          <div className="bg-card/60 p-2 rounded-lg border border-card-border/50">
            <span className="text-[10px] text-muted-foreground block">Meta Fijada</span>
            <strong className="text-xs text-foreground block mt-0.5">{formatCurrencyPYG(monthlyGoal)}</strong>
          </div>
          <div className="bg-card/60 p-2 rounded-lg border border-card-border/50">
            <span className="text-[10px] text-emerald-400 block">Facturado</span>
            <strong className="text-xs text-emerald-400 block mt-0.5">{formatCurrencyPYG(achievedAmount)}</strong>
          </div>
          <div className="bg-card/60 p-2 rounded-lg border border-card-border/50">
            <span className="text-[10px] text-amber-400 block">Restante</span>
            <strong className="text-xs text-amber-300 block mt-0.5">{formatCurrencyPYG(remainingAmount)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

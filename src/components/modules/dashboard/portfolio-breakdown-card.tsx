'use client';

import React from 'react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import {
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Flame,
  PackageCheck,
  Layers,
  Boxes,
  Truck,
} from 'lucide-react';
import { SalesChannelBreakdown, TopProductSummary } from '@/modules/dashboard/types/dashboard.types';

interface PortfolioBreakdownCardProps {
  channels?: SalesChannelBreakdown;
  topProducts?: TopProductSummary[];
}

export function PortfolioBreakdownCard({
  channels,
  topProducts,
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

  // Productos de Mayor Rotación del Mes (Materiales Críticos de Construcción)
  const rotationProducts = [
    {
      rank: 1,
      name: 'Cemento Yguazú / Vallemí PZ 50kg',
      sku: 'CEM-YG-50',
      category: 'Cementos & Ligantes',
      unitsSold: '1.850 bolsas',
      rawQty: 1850,
      revenue: 96200000,
      sharePct: 35,
      growth: 18.4,
      gradient: 'from-emerald-500 to-teal-400',
      barColor: '#10b981',
      badge: 'Alta Demanda',
    },
    {
      rank: 2,
      name: 'Varillas Conformadas 10mm (Ferretería)',
      sku: 'VAR-10MM',
      category: 'Hierros & Estructuras',
      unitsSold: '1.240 barras',
      rawQty: 1240,
      revenue: 68200000,
      sharePct: 25,
      growth: 12.1,
      gradient: 'from-cyan-500 to-blue-500',
      barColor: '#00d2ff',
      badge: 'Despacho Diario',
    },
    {
      rank: 3,
      name: 'Ladrillo Hueco 6 Bocas (Mampostería)',
      sku: 'LAD-HUE-06',
      category: 'Cerámicos & Tejas',
      unitsSold: '28.500 unidades',
      rawQty: 28500,
      revenue: 42750000,
      sharePct: 16,
      growth: 24.8,
      gradient: 'from-amber-500 to-orange-400',
      barColor: '#f59e0b',
      badge: 'Salida Masiva',
    },
    {
      rank: 4,
      name: 'Arena Lavada Especial (Áridos)',
      sku: 'ARE-LAV-M3',
      category: 'Áridos & Cantera',
      unitsSold: '420 m³ (28 viajes)',
      rawQty: 420,
      revenue: 37800000,
      sharePct: 14,
      growth: 8.5,
      gradient: 'from-purple-500 to-indigo-500',
      barColor: '#a855f7',
      badge: 'Cantera Activa',
    },
    {
      rank: 5,
      name: 'Piedra Triturada 5ta (Hormigón)',
      sku: 'PIE-TRI-M3',
      category: 'Áridos & Cantera',
      unitsSold: '210 m³ (14 viajes)',
      rawQty: 210,
      revenue: 27300000,
      sharePct: 10,
      growth: 5.3,
      gradient: 'from-pink-500 to-rose-400',
      barColor: '#ec4899',
      badge: 'Flota Pesada',
    },
  ];

  const totalTopRevenue = rotationProducts.reduce((acc, p) => acc + p.revenue, 0);

  return (
    <div className="bg-card border border-card-border rounded-xl p-6 flex flex-col justify-between shadow-xl space-y-6">
      {/* 1. Cabecera */}
      <div className="flex items-center justify-between border-b border-card-border pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-wide font-mono">
            Desglose de Ingresos & Rendimiento
          </h3>
          <p className="text-[11px] text-muted-foreground font-sans">
            Distribución por canales y rotación de materiales clave
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
      <div className="space-y-3">
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

      {/* 3. MÓDULO NUEVO: Gráfico de Tarjeta con Productos de Mayor Rotación del Mes */}
      <div className="border-t border-card-border pt-4 bg-[#090d16]/80 rounded-xl p-4 border border-card-border/80 space-y-3.5">
        <div className="flex items-center justify-between border-b border-card-border/60 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground font-mono uppercase tracking-wider block">
                Productos de Mayor Rotación del Mes
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Ranking por volumen de despacho físico & facturación
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
            Top 5 del Depósito
          </span>
        </div>

        {/* Gráfico de Barras y Tarjetas de Rotación */}
        <div className="space-y-3">
          {rotationProducts.map((prod) => (
            <div key={prod.rank} className="p-2.5 rounded-lg bg-[#0d121c] border border-card-border/70 hover:border-card-border transition-colors space-y-1.5">
              <div className="flex items-start justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-md bg-card border border-card-border flex items-center justify-center text-[10px] font-mono font-bold text-muted-foreground shrink-0">
                    #{prod.rank}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate text-xs">
                      {prod.name}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                      <span>{prod.sku}</span>
                      <span>&bull;</span>
                      <span className="text-primary">{prod.unitsSold}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono">
                  <span className="text-xs font-bold text-foreground block">
                    {formatCurrencyPYG(prod.revenue)}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold inline-flex items-center gap-0.5">
                    <ArrowUpRight className="w-2.5 h-2.5" />
                    +{prod.growth}%
                  </span>
                </div>
              </div>

              {/* Barra Gráfica Proporcional con Degradado */}
              <div className="space-y-1">
                <div className="h-1.5 w-full bg-[#090d16] rounded-full overflow-hidden border border-card-border/60">
                  <div
                    style={{ width: `${prod.sharePct * 2.5}%` }}
                    className={`h-full rounded-full bg-gradient-to-r ${prod.gradient} transition-all duration-700`}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] font-mono text-muted-foreground">
                  <span className="text-muted-foreground/80">{prod.badge}</span>
                  <span>{prod.sharePct}% del volumen total</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Resumen Consolidado del Top de Rotación */}
        <div className="grid grid-cols-3 gap-2 border-t border-card-border/80 pt-2.5 text-center font-mono">
          <div className="bg-card/60 p-2 rounded-lg border border-card-border/50">
            <span className="text-[10px] text-muted-foreground block">Unids. Despachadas</span>
            <strong className="text-xs text-foreground block mt-0.5">32.220 unids / m³</strong>
          </div>
          <div className="bg-card/60 p-2 rounded-lg border border-card-border/50">
            <span className="text-[10px] text-emerald-400 block">Facturado Top 5</span>
            <strong className="text-xs text-emerald-400 block mt-0.5">{formatCurrencyPYG(totalTopRevenue)}</strong>
          </div>
          <div className="bg-card/60 p-2 rounded-lg border border-card-border/50">
            <span className="text-[10px] text-cyan-400 block">Ciclo Promedio</span>
            <strong className="text-xs text-cyan-300 block mt-0.5">8.2 días rotación</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

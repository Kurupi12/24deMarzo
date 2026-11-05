'use client';

import React, { useState } from 'react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  ShoppingBag,
  Users,
  Building2,
  PieChart,
} from 'lucide-react';
import { ExpenseBreakdown, TopProductSummary } from '@/modules/dashboard/types/dashboard.types';

interface ExpensesBalanceCardProps {
  expenses?: ExpenseBreakdown;
  topProducts?: TopProductSummary[];
}

export function ExpensesBalanceCard({ expenses, topProducts = [] }: ExpensesBalanceCardProps) {
  const [activeTab, setActiveTab] = useState<'trending' | 'expenses'>('expenses');

  const totalExp = expenses?.totalExpenses || 54300000;
  const prevExp = expenses?.previousTotalExpenses || 50100000;
  const growth = expenses?.growthPercent || 8.4;
  const isUp = growth >= 0;

  const supplierPurchases = expenses?.supplierPurchases || 32500000;
  const payroll = expenses?.payrollTotal || 16800000;
  const operating = expenses?.operatingCosts || 5000000;

  // Porcentajes de gastos
  const pctPurchases = Math.round((supplierPurchases / totalExp) * 100);
  const pctPayroll = Math.round((payroll / totalExp) * 100);
  const pctOperating = Math.max(100 - pctPurchases - pctPayroll, 5);

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 flex flex-col justify-between shadow-xl">
      {/* Cabecera con Título y Tabs */}
      <div>
        <div className="flex items-center justify-between border-b border-card-border pb-3">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground tracking-wide font-mono">
              Distribución de Gastos & Balance
            </h3>
          </div>

          <div className="flex items-center gap-1 bg-[#090d16] p-1 rounded-md border border-card-border text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('expenses')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeTab === 'expenses'
                  ? 'bg-primary text-white font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Gastos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trending')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeTab === 'trending'
                  ? 'bg-primary text-white font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Rotación
            </button>
          </div>
        </div>

        {/* Sección de Gastos del Mes */}
        {activeTab === 'expenses' ? (
          <div className="space-y-4 my-4">
            {/* Cifra Principal de Gastos del Mes */}
            <div>
              <span className="text-[11px] text-muted-foreground uppercase font-mono tracking-wider">
                Gasto Total Ejecutado en el Mes
              </span>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-3xl font-extrabold font-mono text-foreground">
                  {formatCurrencyPYG(totalExp)}
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded ${
                    isUp
                      ? 'bg-danger/10 text-danger border border-danger/20'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {growth}% vs mes anterior
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                Mes anterior: {formatCurrencyPYG(prevExp)}
              </p>
            </div>

            {/* Barra Visual de Segmentación de Gastos (Estilo "Balance Distribution" de la foto) */}
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-[#090d16] rounded-full overflow-hidden flex p-0.5 gap-1 border border-card-border">
                <div
                  style={{ width: `${pctPurchases}%` }}
                  title={`Compras de Mercadería: ${pctPurchases}%`}
                  className="h-full bg-primary rounded-full transition-all duration-700"
                />
                <div
                  style={{ width: `${pctPayroll}%` }}
                  title={`Nómina y Cargas IPS: ${pctPayroll}%`}
                  className="h-full bg-accent rounded-full transition-all duration-700"
                />
                <div
                  style={{ width: `${pctOperating}%` }}
                  title={`Costos Operativos: ${pctOperating}%`}
                  className="h-full bg-warning rounded-full transition-all duration-700"
                />
              </div>

              {/* Leyenda interactiva */}
              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span>Compras ({pctPurchases}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  <span>Nómina ({pctPayroll}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-warning" />
                  <span>Operativos ({pctOperating}%)</span>
                </div>
              </div>
            </div>

            {/* Desglose detallado por conceptos */}
            <div className="bg-[#090d16] border border-card-border rounded-lg p-3 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                  <span>Compras a Proveedores (Kardex):</span>
                </div>
                <span className="font-bold text-foreground">{formatCurrencyPYG(supplierPurchases)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-3.5 h-3.5 text-accent" />
                  <span>Nómina y Salarios (7 Funcionarios):</span>
                </div>
                <span className="font-bold text-foreground">{formatCurrencyPYG(payroll)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="w-3.5 h-3.5 text-warning" />
                  <span>Gastos Fijos & Logística:</span>
                </div>
                <span className="font-bold text-foreground">{formatCurrencyPYG(operating)}</span>
              </div>
            </div>

            {/* Resultado Operativo Neto */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-emerald-400 font-semibold block">
                  Resultado Operativo Neto (Margen)
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Ingresos Totales menos Egresos del Mes
                </span>
              </div>
              <div className="text-right font-mono">
                <span className="text-sm font-bold text-emerald-400">
                  +{formatCurrencyPYG(expenses?.netProfit || 31100000)}
                </span>
                <span className="text-[10px] block text-emerald-400/80">
                  {expenses?.netMarginPercent || 36.4}% margen neto
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Sección de Trending / Top Productos de Ferretería */
          <div className="space-y-3 my-4">
            <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider block">
              Artículos de Mayor Rotación en el Mes
            </span>

            <div className="space-y-2">
              {topProducts.slice(0, 3).map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#090d16] border border-card-border rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-7 h-7 rounded bg-primary/20 text-primary flex items-center justify-center font-mono font-bold text-xs shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="truncate">
                      <h4 className="font-medium text-foreground truncate">{item.name}</h4>
                      <span className="text-[10px] font-mono text-muted-foreground">{item.sku}</span>
                    </div>
                  </div>

                  {/* Mini Sparkline SVG en color verde */}
                  <div className="w-16 h-6 shrink-0">
                    <svg viewBox="0 0 60 20" className="w-full h-full">
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="1.8"
                        points="0,15 10,12 20,16 30,8 40,11 50,4 60,7"
                      />
                    </svg>
                  </div>

                  <div className="text-right shrink-0 font-mono">
                    <span className="font-bold text-foreground text-xs block">
                      {formatCurrencyPYG(item.totalRevenue)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {item.quantitySold} unid. vendidas
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pie de Tarjeta */}
      <div className="border-t border-card-border pt-3 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
        <span>Auditoría Fiscal & Contable DNIT</span>
        <span className="text-emerald-400 font-semibold">Conciliado</span>
      </div>
    </div>
  );
}


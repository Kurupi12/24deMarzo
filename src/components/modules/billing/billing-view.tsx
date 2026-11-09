'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { PosTerminal } from './pos-terminal';
import { SalesHistoryTable } from './sales-history-table';
import { InvoiceDetailModal } from './invoice-detail-modal';
import { CashShiftPanel } from './cash-shift-panel';
import { CustomerAccountsPanel } from './customer-accounts-panel';
import { ScheduledOrdersPanel } from './scheduled-orders-panel';
import { ScheduledOrdersAlertBanner } from './scheduled-orders-alert-banner';
import { ReceiptText, History, Landmark, DollarSign, Receipt, CheckCircle2, BookOpen, Calendar } from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';

export function BillingView() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as any) || 'pos';
  const [activeTab, setActiveTab] = useState<'pos' | 'history' | 'shifts' | 'accounts' | 'scheduled'>(initialTab);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSaleForDetail, setSelectedSaleForDetail] = useState<any>(null);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/billing/sales?limit=30');
      const json = await res.json();
      if (json.success) setSales(json.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Totales acumulados
  const totalBilled = sales.reduce((sum, s) => sum + Number(s.grandTotal), 0);
  const totalVat10 = sales.reduce((sum, s) => sum + Number(s.vat10Amount), 0);

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div>
        <div className="flex items-center gap-2">
          <ReceiptText className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Ventas & Facturación Electrónica SIFEN
          </h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Emisión de DTEs fiscales con CDC de 44 dígitos, liquidación de IVA y control de turnos de caja.
        </p>
      </div>

      {/* Alerta Destacada de Entregas Programadas para HOY */}
      <ScheduledOrdersAlertBanner onViewScheduled={() => setActiveTab('scheduled')} />

      {/* Tarjetas KPI de Facturación */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-card border border-card-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Total Facturado</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">{formatCurrencyPYG(totalBilled)}</div>
          <span className="text-[10px] text-muted-foreground font-mono">{sales.length} comprobantes emitidos</span>
        </div>

        <div className="p-4 rounded-lg bg-card border border-card-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Liquidación IVA 10% (DNIT)</span>
            <Receipt className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl font-bold font-mono text-primary">{formatCurrencyPYG(totalVat10)}</div>
          <span className="text-[10px] text-muted-foreground font-mono">Débito fiscal acumulado</span>
        </div>

        <div className="p-4 rounded-lg bg-card border border-card-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Estado SIFEN</span>
            <CheckCircle2 className="w-4 h-4 text-accent" />
          </div>
          <div className="text-xl font-bold font-mono text-accent">100% Operativo</div>
          <span className="text-[10px] text-muted-foreground font-mono">Kuatia Versión 150</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-card-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('pos')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'pos'
              ? 'bg-primary/10 text-primary border border-primary/20 font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ReceiptText className="w-3.5 h-3.5" />
          <span>Punto de Venta (POS)</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('history'); fetchSales(); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-primary/10 text-primary border border-primary/20 font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Historial de Ventas & DTEs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('shifts')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'shifts'
              ? 'bg-primary/10 text-primary border border-primary/20 font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          <span>Control de Cajas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'accounts'
              ? 'bg-primary/10 text-primary border border-primary/20 font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Cuentas Corrientes & Libreta</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scheduled')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'scheduled'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Pedidos Programados & Reservas</span>
        </button>
      </div>

      {/* Contenido */}
      {activeTab === 'pos' ? (
        <PosTerminal
          onSaleCompleted={(sale) => {
            fetchSales();
            if (sale) {
              setSelectedSaleForDetail(sale);
            }
          }}
        />
      ) : activeTab === 'history' ? (
        <SalesHistoryTable
          sales={sales}
          loading={loading}
          onViewInvoice={setSelectedSaleForDetail}
        />
      ) : activeTab === 'shifts' ? (
        <CashShiftPanel />
      ) : activeTab === 'accounts' ? (
        <CustomerAccountsPanel onViewInvoice={setSelectedSaleForDetail} />
      ) : (
        <ScheduledOrdersPanel onOrderDispatched={fetchSales} />
      )}

      {/* Modal de Detalle de DTE */}
      <InvoiceDetailModal
        sale={selectedSaleForDetail}
        isOpen={!!selectedSaleForDetail}
        onClose={() => setSelectedSaleForDetail(null)}
      />
    </div>
  );
}


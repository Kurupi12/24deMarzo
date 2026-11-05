'use client';

import React from 'react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Receipt, QrCode, CheckCircle2, Eye } from 'lucide-react';

interface SalesHistoryProps {
  sales: any[];
  loading: boolean;
  onViewInvoice: (sale: any) => void;
}

export function SalesHistoryTable({ sales, loading, onViewInvoice }: SalesHistoryProps) {
  if (loading) {
    return (
      <div className="bg-card border border-card-border rounded-lg p-12 text-center text-xs text-muted-foreground font-mono">
        Cargando historial de facturación desde Neon Postgres...
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="bg-card border border-card-border rounded-lg p-12 text-center text-xs text-muted-foreground">
        No hay ventas emitidas en el período seleccionado.
      </div>
    );
  }

  return (
    <div className="bg-card border border-card-border rounded-lg overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0d121c] border-b border-card-border text-[11px] font-mono uppercase text-muted-foreground">
            <tr>
              <th className="py-2.5 px-3">Comprobante</th>
              <th className="py-2.5 px-3">Cliente / RUC</th>
              <th className="py-2.5 px-3">Obra / Despacho</th>
              <th className="py-2.5 px-3">Fecha y Hora</th>
              <th className="py-2.5 px-3">Pago</th>
              <th className="py-2.5 px-3 text-right">IVA 10%</th>
              <th className="py-2.5 px-3 text-right">Total Factura</th>
              <th className="py-2.5 px-3 text-center">Estado SIFEN</th>
              <th className="py-2.5 px-3 text-center">DTE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border font-mono text-muted-foreground">
            {sales.map((s) => {
              const dateStr = format(new Date(s.createdAt), "dd/MM/yyyy HH:mm", { locale: es });
              const invoice = s.invoice;

              return (
                <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-foreground block">{s.saleNumber}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{invoice?.invoiceNumber || 'Sin Factura'}</span>
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <p className="font-medium text-foreground truncate max-w-xs">{s.customerName}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{s.customerRuc}</p>
                  </td>
                  <td className="py-2.5 px-3 text-[11px] font-sans">
                    {s.project ? (
                      <span className="inline-block px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-semibold text-[10px] truncate max-w-[140px]" title={s.project.address}>
                        {s.project.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-[10px]">Mostrador</span>
                    )}
                    <span className="block text-[10px] text-muted-foreground font-mono mt-0.5">
                      {s.driver ? `Chofer: ${s.driver.firstName}` : 'Sin chofer'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[11px]">{dateStr}</td>
                  <td className="py-2.5 px-3 text-[11px] font-sans">
                    <span className="block text-foreground">{s.paymentCondition}</span>
                    <span className="text-[10px] text-muted-foreground">{s.paymentMethod.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-primary font-medium">
                    {formatCurrencyPYG(Number(s.vat10Amount))}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-foreground">
                    {formatCurrencyPYG(Number(s.grandTotal))}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Aprobado
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onViewInvoice(s)}
                      title="Ver factura electrónica SIFEN"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0d121c] border border-card-border hover:border-primary text-muted-foreground hover:text-primary transition-colors text-[11px]"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Ver DTE</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-[#0d121c] px-4 py-2 border-t border-card-border flex items-center justify-between text-xs text-muted-foreground font-mono">
        <span>Comprobantes emitidos: <strong className="text-foreground">{sales.length}</strong></span>
        <span>Homologación SIFEN: Versión Kuatia 1.5.0</span>
      </div>
    </div>
  );
}


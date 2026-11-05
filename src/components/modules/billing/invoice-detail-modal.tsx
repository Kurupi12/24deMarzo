'use client';

import React from 'react';
import { X, Printer, ShieldCheck, QrCode } from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';

interface InvoiceDetailModalProps {
  sale: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceDetailModal({ sale, isOpen, onClose }: InvoiceDetailModalProps) {
  if (!isOpen || !sale) return null;

  const invoice = sale.invoice;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-card border border-card-border rounded-lg w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-card-border pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Comprobante Fiscal SIFEN</h3>
              <p className="text-[10px] font-mono text-muted-foreground">{invoice?.invoiceNumber || sale.saleNumber}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CDC de 44 Dígitos */}
        {invoice?.cdc && (
          <div className="p-2.5 rounded bg-[#0d121c] border border-card-border font-mono text-center">
            <span className="text-[10px] text-muted-foreground block uppercase">Código Digital de Control (CDC)</span>
            <span className="text-[11px] text-accent font-bold tracking-wider break-all">{invoice.cdc}</span>
          </div>
        )}

        {/* Datos de Emisor y Cliente */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-[#0d121c] p-3 rounded border border-card-border">
          <div>
            <p className="text-[10px] uppercase font-mono text-muted-foreground">Emisor</p>
            <p className="font-bold text-foreground">Depósito 4 de Marzo S.A.</p>
            <p className="text-muted-foreground font-mono">RUC: 80044444-1</p>
            <p className="text-muted-foreground">Casa Central - Planta Operativa</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-muted-foreground">Receptor</p>
            <p className="font-bold text-foreground truncate">{sale.customerName}</p>
            <p className="text-muted-foreground font-mono">RUC: {sale.customerRuc}</p>
            <p className="text-muted-foreground">Condición: {sale.paymentCondition}</p>
          </div>
        </div>

        {/* Tabla de ítems */}
        <div className="border border-card-border rounded overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-[#0d121c] text-[10px] font-mono uppercase text-muted-foreground">
              <tr>
                <th className="py-1.5 px-2">Cant.</th>
                <th className="py-1.5 px-2">Descripción</th>
                <th className="py-1.5 px-2 text-right">Precio</th>
                <th className="py-1.5 px-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border font-mono text-[11px]">
              {sale.items?.map((item: any) => (
                <tr key={item.id}>
                  <td className="py-1.5 px-2">{item.quantity}</td>
                  <td className="py-1.5 px-2 font-sans truncate max-w-xs">{item.product?.name || 'Artículo'}</td>
                  <td className="py-1.5 px-2 text-right">{formatCurrencyPYG(Number(item.unitPrice))}</td>
                  <td className="py-1.5 px-2 text-right font-bold text-foreground">{formatCurrencyPYG(Number(item.subtotal))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales y Liquidación IVA */}
        <div className="p-3 rounded bg-[#0d121c] border border-card-border font-mono text-xs space-y-1">
          <div className="flex justify-between text-muted-foreground">
            <span>Liquidación IVA 10%:</span>
            <span className="text-primary font-bold">{formatCurrencyPYG(Number(sale.vat10Amount))}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-foreground pt-1 border-t border-card-border">
            <span>Total Facturado:</span>
            <span className="text-emerald-400">{formatCurrencyPYG(Number(sale.grandTotal))}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-card-border">
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            DTE Aprobado por DNIT
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary hover:bg-primary-hover text-white text-xs font-medium"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
}


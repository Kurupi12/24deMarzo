'use client';

import React from 'react';
import { X, Printer, ShieldCheck, CheckCircle2, Building2, Truck, FileText } from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';

interface InvoiceDetailModalProps {
  sale: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceDetailModal({ sale, isOpen, onClose }: InvoiceDetailModalProps) {
  if (!isOpen || !sale) return null;

  const invoice = sale.invoice;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('es-PY', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative bg-card border border-card-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera de la Ventana (no imprimible) */}
        <div className="flex items-center justify-between p-4 border-b border-card-border bg-[#0b0e14] no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Comprobante de Venta & Despacho</h3>
              <p className="text-[11px] font-mono text-muted-foreground">{sale.saleNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-card-border text-muted-foreground hover:bg-muted/20 hover:text-foreground transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de Acciones de Impresión (no imprimible) */}
        <div className="flex items-center justify-between gap-3 p-3 bg-muted/20 border-b border-card-border no-print">
          <span className="text-xs font-mono text-muted-foreground">
            Total:{' '}
            <strong className="text-emerald-400">
              {formatCurrencyPYG(Number(sale.grandTotal))}
            </strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Comprobante</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-[#121824] hover:bg-[#1a2334] text-foreground rounded-lg text-xs font-medium flex items-center gap-1.5 border border-card-border transition-all"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Cerrar</span>
            </button>
          </div>
        </div>

        {/* Contenedor del Comprobante (Imprimible & Scrollable en Pantalla) */}
        <div className="p-4 overflow-y-auto flex-1 bg-[#080b11]">
          <div
            id="printable-receipt"
            className="bg-[#0f141f] border border-card-border/80 rounded-lg p-5 max-w-sm mx-auto text-xs font-mono text-foreground shadow-xl space-y-3"
          >
            {/* Cabecera Depósito 4 de Marzo */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-card-border">
              <h2 className="text-base font-bold tracking-wider text-foreground uppercase">
                Depósito 4 de Marzo
              </h2>
              <p className="text-[10px] text-muted-foreground font-sans">
                Materiales de Construcción & Ferretería Industrial
              </p>
              <p className="text-[10px] text-muted-foreground">
                RUC: 80092345-1 • Cel: +595 971 505222
              </p>
              <p className="text-[10px] text-muted-foreground">
                Avda. Principal esq. Las Piedras - Planta Central
              </p>
            </div>

            {/* Tipo de Documento y Validación Fiscal */}
            <div className="py-2 border-b border-dashed border-card-border space-y-1">
              <div className="text-center font-bold text-xs uppercase tracking-wide text-primary">
                Comprobante de Venta y Despacho
              </div>
              {invoice ? (
                <div className="text-[10px] text-emerald-400 text-center font-mono space-y-0.5">
                  <div className="font-bold">FACTURA ELECTRÓNICA SIFEN: {invoice.invoiceNumber}</div>
                  <div className="text-[9px] text-muted-foreground break-all">
                    CDC: {invoice.cdc}
                  </div>
                  <div className="text-[9px]">Estado DNIT: Aprobado (Kuatia 1.5)</div>
                </div>
              ) : (
                <div className="text-[10px] text-muted-foreground text-center">
                  Documento Interno de Mostrador / No Válido para Crédito Fiscal
                </div>
              )}
              <div className="flex justify-between text-[11px] pt-1.5">
                <span className="text-muted-foreground">Venta N°:</span>
                <span className="font-bold">{sale.saleNumber}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Fecha / Hora:</span>
                <span>{formatDate(sale.createdAt)}</span>
              </div>
            </div>

            {/* Datos del Cliente */}
            <div className="py-2 border-b border-dashed border-card-border text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-semibold text-right max-w-[200px] truncate">
                  {sale.customerName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">RUC / C.I.:</span>
                <span>{sale.customerRuc}</span>
              </div>
              {sale.customerAddress && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dirección:</span>
                  <span className="text-right max-w-[200px] truncate">
                    {sale.customerAddress}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Condición:</span>
                <span className="font-bold text-primary">
                  {sale.paymentCondition} ({sale.paymentMethod?.replace('_', ' ') || 'EFECTIVO'})
                </span>
              </div>
              {sale.project && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Obra:</span>
                  <span className="text-right max-w-[200px] truncate font-medium">
                    {sale.project.name}
                  </span>
                </div>
              )}
              {(sale.driver || sale.vehiclePlate) && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Logística:</span>
                  <span className="text-foreground">
                    {sale.driver
                      ? `${sale.driver.firstName || ''} ${sale.driver.lastName || ''}`.trim()
                      : 'Chofer Asignado'}{' '}
                    {sale.vehiclePlate ? `(${sale.vehiclePlate})` : ''}
                  </span>
                </div>
              )}
              {(sale.secondaryDriver || sale.secondaryVehiclePlate) && (
                <div className="flex justify-between text-muted-foreground">
                  <span>2do Camión:</span>
                  <span className="text-foreground">
                    {sale.secondaryDriver
                      ? `${sale.secondaryDriver.firstName || ''} ${sale.secondaryDriver.lastName || ''}`.trim()
                      : '2do Chofer'}{' '}
                    {sale.secondaryVehiclePlate ? `(${sale.secondaryVehiclePlate})` : ''}
                  </span>
                </div>
              )}
              {sale.deliveryNotes && (
                <div className="text-[10px] text-muted-foreground italic pt-0.5">
                  Obs: &quot;{sale.deliveryNotes}&quot;
                </div>
              )}
            </div>

            {/* Detalle de Artículos */}
            <div className="py-2 border-b border-dashed border-card-border space-y-1.5">
              <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-muted-foreground border-b border-card-border pb-1">
                <div className="col-span-2">Cant</div>
                <div className="col-span-5">Descripción</div>
                <div className="col-span-2 text-right">P.Unit</div>
                <div className="col-span-3 text-right">Total</div>
              </div>
              {sale.items?.map((item: any, idx: number) => (
                <div
                  key={item.id || idx}
                  className="grid grid-cols-12 text-[11px] py-1 border-b border-card-border/40 last:border-0 items-center"
                >
                  <div className="col-span-2 font-bold">
                    {item.quantity} {item.product?.unitOfMeasure || item.product?.unit || 'UN'}
                  </div>
                  <div className="col-span-5 truncate pr-1">
                    {item.product?.name || item.product?.description || 'Material'}
                  </div>
                  <div className="col-span-2 text-right text-muted-foreground">
                    {formatCurrencyPYG(Number(item.unitPrice))}
                  </div>
                  <div className="col-span-3 text-right font-bold">
                    {formatCurrencyPYG(Number(item.subtotal))}
                  </div>
                </div>
              ))}
            </div>

            {/* Liquidación de IVA */}
            <div className="py-2 border-b border-dashed border-card-border text-[10px] space-y-0.5 text-muted-foreground">
              <div className="flex justify-between">
                <span>Total Exentas:</span>
                <span>{formatCurrencyPYG(Number(sale.totalExempt || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Gravadas 5%:</span>
                <span>{formatCurrencyPYG(Number(sale.totalVat5 || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Gravadas 10%:</span>
                <span>{formatCurrencyPYG(Number(sale.totalVat10 || 0))}</span>
              </div>
              <div className="flex justify-between pt-0.5 border-t border-card-border/40 font-medium">
                <span>Liquidación Total IVA:</span>
                <span>
                  {formatCurrencyPYG(
                    Number(sale.vat5Amount || 0) + Number(sale.vat10Amount || 0)
                  )}
                </span>
              </div>
            </div>

            {/* Total a Pagar */}
            <div className="py-3 border-b-2 border-dashed border-card-border flex justify-between items-center text-sm font-bold">
              <span className="tracking-wide text-foreground">TOTAL A PAGAR:</span>
              <span className="text-base text-primary font-bold">
                {formatCurrencyPYG(Number(sale.grandTotal))}
              </span>
            </div>

            {/* Pie de Recibo / Firma */}
            <div className="pt-3 text-center space-y-2 text-[10px] text-muted-foreground">
              <p>¡Gracias por su compra en Depósito 4 de Marzo!</p>
              <p className="text-[9px]">
                Conserve este comprobante para control de carga y recepción en obra.
              </p>
              <div className="pt-5 space-y-1">
                <div className="border-t border-muted-foreground/40 w-3/4 mx-auto"></div>
                <p className="text-[9px]">Firma y Aclaración de Recepción</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

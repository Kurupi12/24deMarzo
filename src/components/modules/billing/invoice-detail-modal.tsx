'use client';

import React, { useState } from 'react';
import { X, Printer, ShieldCheck, CheckCircle2, Truck, FileText, Copy } from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { DeliveryOrderA4 } from './delivery-order-a4';
import { ReservationReceiptA4 } from './reservation-receipt-a4';
import { printElementById } from '@/shared/utils/print-html';

interface InvoiceDetailModalProps {
  sale: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceDetailModal({ sale, isOpen, onClose }: InvoiceDetailModalProps) {
  // Documento activo para previsualizar e imprimir: 'delivery_order' (A4 duplicado) o 'invoice' (fiscal SIFEN)
  const [activeDoc, setActiveDoc] = useState<'delivery_order' | 'invoice'>('delivery_order');

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

  const handlePrint = (mode: 'delivery_order' | 'invoice') => {
    if (mode === 'delivery_order') {
      const docTitle = sale.isScheduled
        ? `Comprobante_Reserva_${sale.reservationReceiptNumber || sale.saleNumber || 'A4'}`
        : `Orden_Entrega_${sale.saleNumber || 'A4'}`;

      printElementById('printable-delivery-order', {
        paperSize: 'A4',
        title: docTitle,
      });
    } else {
      printElementById('printable-receipt', {
        paperSize: 'ticket',
        title: `Ticket_${sale.saleNumber || 'Venta'}`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-card border border-card-border rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Cabecera Principal del Modal (no imprimible) */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-card-border bg-[#0b0e14] no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Documentos de Venta Emitidos &bull; {sale.saleNumber}
              </h3>
              <p className="text-[11px] font-mono text-muted-foreground">
                {sale.customerName} &bull; Total: <strong className="text-emerald-400">{formatCurrencyPYG(Number(sale.grandTotal))}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-card-border text-muted-foreground hover:bg-muted/20 hover:text-foreground transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pestañas de Selección de Documento & Botones de Impresión (no imprimible) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/20 border-b border-card-border no-print">
          {/* Pestañas */}
          <div className="flex items-center gap-1.5 bg-[#090d14] p-1 rounded-lg border border-card-border">
            <button
              type="button"
              onClick={() => setActiveDoc('delivery_order')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeDoc === 'delivery_order'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{sale.isScheduled ? 'Comprobante de Reserva & Seña (A4)' : 'Comprobante / Orden de Entrega (A4 Duplicado)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDoc('invoice')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeDoc === 'invoice'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{invoice ? 'Factura Electrónica SIFEN' : 'Ticket Térmico (Sin Factura)'}</span>
            </button>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2">
            {activeDoc === 'delivery_order' ? (
              <button
                type="button"
                onClick={() => handlePrint('delivery_order')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>
                  {sale.isScheduled
                    ? 'Imprimir Comprobante de Reserva (A4 Duplicado)'
                    : 'Imprimir Comprobante de Entrega (A4 Duplicado)'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handlePrint('invoice')}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>{invoice ? 'Imprimir Factura SIFEN' : 'Imprimir Ticket Térmico'}</span>
              </button>
            )}

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

        {/* Área de Visualización y Contenedor de Impresión */}
        <div className="p-4 overflow-y-auto flex-1 bg-[#06080d]">
          {activeDoc === 'delivery_order' ? (
            /* Vista de la Orden de Entrega Duplicado en Hoja A4 */
            <div className="flex flex-col items-center">
              <div className="text-[11px] font-mono text-muted-foreground mb-2 flex items-center gap-2 no-print">
                <Copy className="w-3.5 h-3.5 text-primary" />
                <span>
                  {sale.isScheduled
                    ? 'Vista Previa: Comprobante de Reserva & Seña (Original + Duplicado en A4)'
                    : 'Vista Previa: 2 órdenes en 1 hoja A4 (Original Superior + Duplicado Inferior)'}
                </span>
              </div>
              <div className="w-full max-w-[200mm] bg-white rounded shadow-2xl p-2 border border-neutral-300">
                {sale.isScheduled ? (
                  <ReservationReceiptA4 sale={sale} />
                ) : (
                  <DeliveryOrderA4 sale={sale} />
                )}
              </div>
            </div>
          ) : (
            /* Vista de la Factura Electrónica SIFEN / Ticket */
            <div
              id="printable-receipt"
              className="bg-[#0f141f] border border-card-border/80 rounded-lg p-5 max-w-sm mx-auto text-xs font-mono text-foreground shadow-xl space-y-3"
            >
              {/* Cabecera Depósito 4 de Marzo */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-card-border">
                <h2 className="text-base font-bold tracking-wider text-foreground uppercase">
                  Depósito 4 de Marzo S.A.
                </h2>
                <p className="text-[10px] text-muted-foreground font-sans">
                  Materiales de Construcción & Ferretería Industrial
                </p>
                <p className="text-[10px] text-muted-foreground">
                  RUC: 80092345-1 &bull; Cel: +595 971 505222
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Avda. Principal esq. Las Piedras - Planta Central
                </p>
              </div>

              {/* Tipo de Documento y Validación Fiscal SIFEN */}
              <div className="py-2 border-b border-dashed border-card-border space-y-1">
                <div className="text-center font-bold text-xs uppercase tracking-wide text-primary">
                  {invoice ? 'Factura Electrónica SIFEN' : 'Comprobante de Venta Interno'}
                </div>
                {invoice ? (
                  <div className="text-[10px] text-emerald-400 text-center font-mono space-y-0.5">
                    <div className="font-bold">N°: {invoice.invoiceNumber}</div>
                    <div className="text-[9px] text-muted-foreground break-all">
                      CDC: {invoice.cdc}
                    </div>
                    <div className="text-[9px]">Estado DNIT: Aprobado (Kuatia Versión 150)</div>
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground text-center">
                    Documento Interno de Mostrador / Sin Valor Fiscal
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
                    {sale.paymentCondition?.replace(/_/g, ' ')} ({sale.paymentMethod?.replace(/_/g, ' ') || 'EFECTIVO'})
                  </span>
                </div>
                {sale.paymentReference && (
                  <div className="flex justify-between text-blue-400 font-mono text-[10.5px]">
                    <span>Comprobante Ref:</span>
                    <span className="font-bold">{sale.paymentReference}</span>
                  </div>
                )}
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
                <p>&iexcl;Gracias por su compra en Depósito 4 de Marzo!</p>
                <p className="text-[9px]">
                  Conserve este comprobante para control de carga y recepción en obra.
                </p>
                <div className="pt-5 space-y-1">
                  <div className="border-t border-muted-foreground/40 w-3/4 mx-auto"></div>
                  <p className="text-[9px]">Firma y Aclaración de Recepción</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

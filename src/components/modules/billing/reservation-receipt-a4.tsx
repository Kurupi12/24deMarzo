'use client';

import React from 'react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { numberToWordsPYG } from '@/shared/utils/number-to-words';

interface ReservationReceiptA4Props {
  sale: any;
}

export function ReservationReceiptA4({ sale }: ReservationReceiptA4Props) {
  if (!sale) return null;

  const totalAmount = Number(sale.grandTotal || 0);
  const downPayment = Number(sale.downPayment || 0);
  const balanceDue = Number(sale.balanceDue || (totalAmount - downPayment));
  const downPaymentInWords = numberToWordsPYG(downPayment);

  // Formato de fechas
  const createdAtFormatted = new Date(sale.createdAt || Date.now()).toLocaleDateString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const scheduledDateFormatted = sale.scheduledDeliveryDate
    ? new Date(sale.scheduledDeliveryDate).toLocaleDateString('es-PY', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : 'A coordinar';

  const renderSingleReceipt = (copyType: 'ORIGINAL' | 'DUPLICADO') => {
    const isOriginal = copyType === 'ORIGINAL';

    return (
      <div className="relative border border-black p-3 bg-white text-black font-sans text-[10px] leading-tight flex flex-col justify-between h-[132mm] max-h-[132mm] box-border overflow-hidden">
        {/* Banda lateral */}
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 -rotate-90 text-[7px] font-mono tracking-widest text-neutral-500 uppercase select-none pointer-events-none">
          {isOriginal ? 'Original - Cliente (Reserva)' : 'Duplicado - Control Caja / Depósito'}
        </div>

        {/* ================= BLOQUE 1: CABECERA ================= */}
        <div className="border-b border-black pb-2 flex items-start justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-sm font-extrabold tracking-wider uppercase font-serif text-black leading-none">
              Depósito 4 de Marzo S.A.
            </h1>
            <p className="text-[8px] font-semibold text-neutral-800 tracking-tight mt-0.5">
              MATERIALES DE CONSTRUCCIÓN &bull; FERRETERÍA &bull; HIERROS EN GENERAL
            </p>
            <p className="text-[7.5px] text-neutral-700 mt-0.5">
              Avda. Principal esq. Las Piedras &bull; Tel: (021) 505-222 / (0971) 505-222 &bull; RUC: 80092345-1
            </p>
          </div>

          <div className="text-right flex flex-col items-end min-w-[210px]">
            <span className="text-[7.5px] font-mono font-bold tracking-widest px-2 py-0.5 border border-black uppercase bg-neutral-100">
              {isOriginal ? 'ORIGINAL (CLIENTE)' : 'DUPLICADO (DEPÓSITO)'}
            </span>
            <div className="text-xs font-black uppercase tracking-wider text-black mt-1">
              COMPROBANTE DE RESERVA & SEÑA
            </div>
            <div className="text-[8.5px] font-bold text-neutral-800 font-mono">
              N° {sale.reservationReceiptNumber || sale.saleNumber}
            </div>
            <div className="text-[8px] font-mono text-neutral-600 mt-0.5">
              Emisión: {createdAtFormatted}
            </div>
          </div>
        </div>

        {/* ================= BLOQUE 2: DATOS DEL CLIENTE Y FECHA PROGRAMADA ================= */}
        <div className="border-b border-black text-[9px] grid grid-cols-12 py-1.5 gap-y-1">
          <div className="col-span-8">
            <span className="font-bold">Cliente: </span>
            <span className="font-semibold uppercase">{sale.customerName}</span>
          </div>
          <div className="col-span-4 text-right">
            <span className="font-bold">RUC / C.I.: </span>
            <span className="font-mono font-bold">{sale.customerRuc}</span>
          </div>

          <div className="col-span-12">
            <span className="font-bold">Dirección / Obra de Entrega: </span>
            <span className="font-medium">{sale.customerAddress || sale.project?.address || 'Mostrador / Planta'}</span>
          </div>

          <div className="col-span-12 bg-amber-50 border border-amber-300 p-1 rounded text-[8.5px] font-mono flex items-center justify-between mt-0.5">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-amber-900 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                <line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/>
                <line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
              <span className="font-bold text-black uppercase">FECHA DE ENTREGA PROGRAMADA: </span>
              <span className="font-bold text-amber-900 uppercase underline">{scheduledDateFormatted}</span>
            </div>
            {sale.deliveryTimeSlot && (
              <span className="font-bold text-amber-800 uppercase">
                Turno: {sale.deliveryTimeSlot}
              </span>
            )}
          </div>
        </div>

        {/* ================= BLOQUE 3: DETALLE DE MATERIALES RESERVADOS ================= */}
        <div className="flex-1 py-1.5 flex flex-col justify-between">
          <div className="border border-black">
            <div className="bg-neutral-100 border-b border-black grid grid-cols-12 text-[8px] font-bold font-mono py-1 px-2 uppercase">
              <div className="col-span-2">Cód. / SKU</div>
              <div className="col-span-6">Descripción del Material</div>
              <div className="col-span-2 text-center">Cantidad</div>
              <div className="col-span-2 text-right">Subtotal</div>
            </div>

            <div className="divide-y divide-neutral-200">
              {sale.items?.map((item: any, idx: number) => (
                <div key={idx} className="grid grid-cols-12 text-[8px] font-mono py-0.5 px-2 items-center">
                  <div className="col-span-2 text-neutral-600 font-bold">{item.product?.sku || 'SKU'}</div>
                  <div className="col-span-6 font-semibold uppercase">{item.product?.name || 'Material'}</div>
                  <div className="col-span-2 text-center font-bold">
                    {item.quantity} {item.product?.unitOfMeasure || 'UN'}
                  </div>
                  <div className="col-span-2 text-right font-bold text-black">
                    {formatCurrencyPYG(Number(item.quantity) * Number(item.unitPrice))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ================= BLOQUE 4: TOTALES, SEÑA Y SALDO CONTRA ENTREGA ================= */}
          <div className="mt-1.5 p-2 bg-neutral-50 border border-black grid grid-cols-12 gap-2 text-[8.5px] font-mono">
            <div className="col-span-7 flex flex-col justify-center">
              <div>
                <span className="font-bold">SEÑA RECIBIDA: </span>
                <span className="font-extrabold uppercase">{downPaymentInWords} GUARANÍES.-</span>
              </div>
              {sale.paymentReference && (
                <div className="text-[7.5px] text-neutral-600 mt-0.5">
                  Medio de Pago Seña: <strong>{sale.paymentMethod}</strong> &bull; Ref/Comprobante: <strong>{sale.paymentReference}</strong>
                </div>
              )}
            </div>

            <div className="col-span-5 text-right space-y-0.5 border-l border-neutral-300 pl-2">
              <div className="flex justify-between text-neutral-700">
                <span>VALOR TOTAL PEDIDO:</span>
                <span className="font-bold">{formatCurrencyPYG(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>SEÑA ABONADA HOY:</span>
                <span>-{formatCurrencyPYG(downPayment)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-black pt-1 border-t border-black">
                <span>SALDO CONTRA ENTREGA:</span>
                <span className="text-red-700">{formatCurrencyPYG(balanceDue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= BLOQUE 5: CLÁUSULA DE RESERVA Y FIRMAS ================= */}
        <div className="border-t border-black pt-1 text-[7.5px] text-neutral-800 leading-tight">
          <p className="italic text-justify">
            El presente comprobante certifica la reserva de los materiales arriba indicados para su entrega en la fecha y dirección acordadas. El saldo pendiente de <strong>{formatCurrencyPYG(balanceDue)}</strong> deberá ser cancelado en el momento de la entrega, oportunidad en la cual se emitirá el comprobante definitivo o factura correspondiente.
          </p>

          <div className="grid grid-cols-2 gap-8 pt-5 pb-0.5 text-center font-mono text-[8px]">
            <div>
              <div className="border-t border-black pt-0.5">
                <span className="font-bold block uppercase">Firma del Cliente</span>
                <span className="text-[7.5px] text-neutral-700 font-sans">
                  Aclaración: {sale.customerName}
                </span>
              </div>
            </div>

            <div>
              <div className="border-t border-black pt-0.5">
                <span className="font-bold block uppercase">Depósito 4 de Marzo S.A.</span>
                <span className="text-[7.5px] text-neutral-700 font-sans">
                  Recepción de Seña y Reserva
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="printable-delivery-order" className="w-full max-w-[196mm] mx-auto bg-white p-0 space-y-1 box-border">
      {renderSingleReceipt('ORIGINAL')}

      <div className="w-full flex items-center justify-between text-[7px] font-mono text-neutral-400 select-none py-0.5 border-t border-b border-dashed border-neutral-300 my-0.5">
        <span>&bull; &bull; &bull; TIJERA / CORTAR AQUÍ</span>
        <span className="tracking-widest uppercase font-bold text-neutral-500">
          - - - - - - - - - - - - - - - COMPROBANTE DE RESERVA &bull; DUPLICADO - - - - - - - - - - - - - - -
        </span>
        <span>ORIGINAL CLIENTE / DUPLICADO DEPÓSITO &bull; &bull; &bull;</span>
      </div>

      {renderSingleReceipt('DUPLICADO')}
    </div>
  );
}


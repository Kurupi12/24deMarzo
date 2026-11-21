'use client';

import React from 'react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { numberToWordsPYG } from '@/shared/utils/number-to-words';

interface QuotationA4Props {
  sale: any;
}

export function QuotationA4({ sale }: QuotationA4Props) {
  if (!sale) return null;

  const totalAmount = Number(sale.grandTotal || 0);
  const totalInWords = numberToWordsPYG(totalAmount);

  const saleDate = new Date(sale.createdAt || Date.now());
  const dateFormatted = saleDate.toLocaleDateString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const validUntilDate = new Date(saleDate);
  validUntilDate.setDate(validUntilDate.getDate() + 7);
  const validUntilFormatted = validUntilDate.toLocaleDateString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div
      id="printable-delivery-order"
      className="bg-white text-black font-sans w-[210mm] max-w-[210mm] min-h-[280mm] mx-auto p-[10mm] box-border flex flex-col justify-between"
    >
      <div className="space-y-4">
        {/* Cabecera Oficial Depósito 4 de Marzo */}
        <div className="border-b-2 border-black pb-3 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-extrabold tracking-wider uppercase font-serif text-black leading-none">
              Depósito 4 de Marzo
            </h1>
            <p className="text-[10px] font-semibold text-neutral-800 tracking-tight mt-1">
              MATERIALES DE CONSTRUCCIÓN &bull; FERRETERÍA INDUSTRIAL &bull; VENTA DE HIERROS EN GENERAL
            </p>
            <p className="text-[9.5px] text-neutral-700 mt-1">
              Avda. Defensores del Chaco casi 1ro de Mayo &bull; Tel: 0972 465511 &bull; RUC: 80134022-5
            </p>
          </div>

          <div className="text-right border border-black px-3 py-2 bg-neutral-100 min-w-[210px]">
            <div className="text-xs font-black uppercase tracking-wider text-black">
              PRESUPUESTO DE MATERIALES
            </div>
            <div className="text-[9px] font-bold text-neutral-700">
              DOCUMENTO INFORMATIVO (SIN VALOR FISCAL)
            </div>
            <div className="text-sm font-mono font-black text-black mt-1">
              N° {sale.saleNumber || 'PRES-0000001'}
            </div>
          </div>
        </div>

        {/* Datos del Cliente y Validez */}
        <div className="border border-black p-2.5 text-[10.5px] grid grid-cols-12 gap-y-1.5 gap-x-2">
          <div className="col-span-8">
            <span className="font-bold">Cliente / Solicitante: </span>
            <span className="font-semibold uppercase">{sale.customerName}</span>
          </div>
          <div className="col-span-4 text-right">
            <span className="font-bold">RUC / C.I.: </span>
            <span className="font-mono font-bold">{sale.customerRuc}</span>
          </div>

          <div className="col-span-8">
            <span className="font-bold">Dirección / Obra: </span>
            <span>
              {sale.project
                ? `${sale.project.name} (${sale.project.address})`
                : sale.customerAddress || 'A confirmar'}
            </span>
          </div>
          <div className="col-span-4 text-right">
            <span className="font-bold">Fecha Emisión: </span>
            <span className="font-mono">{dateFormatted}</span>
          </div>

          <div className="col-span-8">
            <span className="font-bold">Condición Cotizada: </span>
            <span>{sale.paymentCondition?.replace(/_/g, ' ')}</span>
          </div>
          <div className="col-span-4 text-right">
            <span className="font-bold">Validez: </span>
            <span className="font-mono font-bold">Hasta {validUntilFormatted}</span>
          </div>
        </div>

        {/* Tabla de Materiales */}
        <div className="border border-black">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-black bg-neutral-100 font-bold uppercase text-[9.5px] text-black">
                <th className="py-1.5 px-2 text-left w-20 border-r border-black">CÓDIGO</th>
                <th className="py-1.5 px-2 text-center w-24 border-r border-black">CANTIDAD</th>
                <th className="py-1.5 px-2 text-left border-r border-black">DESCRIPCIÓN DEL MATERIAL</th>
                <th className="py-1.5 px-2 text-right w-28 border-r border-black">PRECIO UNIT.</th>
                <th className="py-1.5 px-2 text-right w-28">SUBTOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-300 font-mono">
              {sale.items?.map((item: any, idx: number) => (
                <tr key={item.id || idx}>
                  <td className="py-1.5 px-2 border-r border-black font-semibold">
                    {item.product?.sku || 'ART'}
                  </td>
                  <td className="py-1.5 px-2 border-r border-black text-center font-bold">
                    {item.quantity} {item.product?.unitOfMeasure || 'UN'}
                  </td>
                  <td className="py-1.5 px-2 border-r border-black font-sans font-medium">
                    {item.product?.name || 'Material de Construcción'}
                  </td>
                  <td className="py-1.5 px-2 border-r border-black text-right">
                    {formatCurrencyPYG(Number(item.unitPrice))}
                  </td>
                  <td className="py-1.5 px-2 text-right font-bold">
                    {formatCurrencyPYG(Number(item.subtotal))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="border border-black p-3 bg-neutral-50 grid grid-cols-12 gap-2 items-center">
          <div className="col-span-8 font-mono text-[10px] leading-relaxed">
            <div>
              <span className="font-bold font-sans">SON GUARANÍES: </span>
              <span className="font-bold uppercase">{totalInWords} .-</span>
            </div>
            <div className="text-[9px] text-neutral-700 mt-1">
              IVA incluido (10%: {formatCurrencyPYG(Number(sale.vat10Amount || 0))} | 5%: {formatCurrencyPYG(Number(sale.vat5Amount || 0))})
            </div>
          </div>
          <div className="col-span-4 text-right border-l border-black pl-3">
            <div className="text-[9px] uppercase font-bold text-neutral-600">TOTAL PRESUPUESTADO</div>
            <div className="text-base font-black font-mono text-black">
              {formatCurrencyPYG(totalAmount)}
            </div>
          </div>
        </div>
      </div>

      {/* Nota al pie */}
      <div className="border-t border-black pt-3 mt-6 text-[9.5px] text-neutral-700 flex items-end justify-between gap-4">
        <div className="max-w-lg leading-relaxed">
          <strong>NOTA IMPORTANTE:</strong> Este presupuesto es únicamente informativo y{' '}
          <strong>NO reserva ni descuenta mercadería del stock</strong> hasta que el cliente confirme la compra. Los precios están sujetos a variación según disponibilidad y cotización vigente al momento de facturar.
        </div>
        <div className="text-center w-48 shrink-0">
          <div className="border-t border-black pt-1 font-bold uppercase text-[9px]">
            Depósito 4 de Marzo
          </div>
          <div className="text-[8px] text-neutral-600">Atención al Cliente</div>
        </div>
      </div>
    </div>
  );
}

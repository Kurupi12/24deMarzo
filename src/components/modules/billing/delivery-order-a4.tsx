'use client';

import React from 'react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { numberToWordsPYG } from '@/shared/utils/number-to-words';

interface DeliveryOrderA4Props {
  sale: any;
}

export function DeliveryOrderA4({ sale }: DeliveryOrderA4Props) {
  if (!sale) return null;

  const invoice = sale.invoice;
  const isContado = sale.paymentCondition === 'CONTADO';
  const totalAmount = Number(sale.grandTotal || 0);
  const totalInWords = numberToWordsPYG(totalAmount);

  // Formato de fecha y hora
  const saleDate = new Date(sale.createdAt || Date.now());
  const dateFormatted = saleDate.toLocaleDateString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeFormatted = saleDate.toLocaleTimeString('es-PY', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const renderSingleOrder = (copyType: 'ORIGINAL' | 'DUPLICADO') => {
    const isOriginal = copyType === 'ORIGINAL';

    return (
      <div className="relative border border-black p-3 bg-white text-black font-sans text-[10px] leading-tight flex flex-col justify-between h-[134mm] box-border overflow-hidden">
        {/* Banda lateral tipo imprenta continua (como en la foto real) */}
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[7px] font-mono tracking-widest text-neutral-500 uppercase select-none pointer-events-none">
          {isOriginal ? 'Original Blanco - Cliente / Obra' : 'Duplicado Amarillo - Control Depósito / Archivo'}
        </div>

        {/* ================= BLOQUE 1: CABECERA ================= */}
        <div className="border-b border-black pb-1.5 flex items-start justify-between gap-2">
          {/* Datos de la Empresa (Izquierda) */}
          <div className="flex-1">
            <h1 className="text-sm font-extrabold tracking-wider uppercase leading-none font-serif text-black">
              Depósito 4 de Marzo S.A.
            </h1>
            <p className="text-[8px] font-semibold text-neutral-800 tracking-tight mt-0.5">
              MATERIALES DE CONSTRUCCIÓN &bull; FERRETERÍA INDUSTRIAL &bull; VENTA DE HIERROS EN GENERAL
            </p>
            <p className="text-[7.5px] text-neutral-700 mt-0.5">
              Casa Central: Avda. Principal esq. Las Piedras &bull; Tel: (021) 505-222 / (0971) 505-222
            </p>
            <p className="text-[7.5px] text-neutral-700">
              Sucursales: San Lorenzo &bull; Capiatá &bull; Luque &bull; Mariano R. Alonso &bull; RUC: 80092345-1
            </p>
          </div>

          {/* Título de Orden & Identificación (Derecha) */}
          <div className="text-right flex flex-col items-end min-w-[200px]">
            <span className="text-[7px] font-mono font-bold tracking-widest px-1.5 py-0.5 border border-black uppercase bg-neutral-100">
              {isOriginal ? 'ORIGINAL' : 'DUPLICADO'}
            </span>
            <div className="text-xs font-black uppercase tracking-wider text-black mt-0.5">
              ORDEN DE ENTREGA
            </div>
            <div className="text-[8px] font-bold text-neutral-800">
              SIN VALOR FISCAL
            </div>
            <div className="text-xs font-mono font-bold text-black mt-0.5">
              N° {sale.saleNumber || '001-001-0000000'}
            </div>

            {/* Casillas de Condición de Venta: CONTADO / CREDITO */}
            <div className="flex items-center gap-3 mt-1 text-[8.5px] font-bold font-mono">
              <span className="flex items-center gap-1">
                CONTADO
                <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-black text-[9px] font-bold">
                  {isContado ? 'X' : ''}
                </span>
              </span>
              <span className="flex items-center gap-1">
                CRÉDITO
                <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-black text-[9px] font-bold">
                  {!isContado ? 'X' : ''}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* ================= BLOQUE 2: DATOS DEL CLIENTE Y DESPACHO ================= */}
        <div className="border-b border-black text-[8.5px] grid grid-cols-12 py-1 gap-y-0.5">
          <div className="col-span-8">
            <span className="font-bold">Nombre o Razón Social: </span>
            <span className="font-medium">{sale.customerName || 'Consumidor Final'}</span>
          </div>
          <div className="col-span-4 text-right">
            <span className="font-bold">RUC / C.I.: </span>
            <span className="font-mono font-medium">{sale.customerRuc || '44444401-7'}</span>
          </div>

          <div className="col-span-8">
            <span className="font-bold">Dirección: </span>
            <span className="font-medium">{sale.customerAddress || 'Planta Central / Retiro en Mostrador'}</span>
          </div>
          <div className="col-span-4 text-right">
            <span className="font-bold">Fecha: </span>
            <span className="font-mono">{dateFormatted}</span>
            <span className="font-bold ml-1.5">Hora: </span>
            <span className="font-mono">{timeFormatted}</span>
          </div>

          <div className="col-span-6">
            <span className="font-bold">Obra / Destino: </span>
            <span className="font-medium">
              {sale.project ? `${sale.project.name} (${sale.project.address})` : 'Mostrador / Planta'}
            </span>
          </div>
          <div className="col-span-3">
            <span className="font-bold">Chofer: </span>
            <span className="font-medium">
              {sale.driver ? `${sale.driver.firstName || ''} ${sale.driver.lastName || ''}`.trim() : 'Mostrador'}
            </span>
          </div>
          <div className="col-span-3 text-right">
            <span className="font-bold">Chapa/Camión: </span>
            <span className="font-mono font-bold">{sale.vehiclePlate || 'S/D'}</span>
          </div>

          {invoice?.invoiceNumber && (
            <div className="col-span-12 pt-0.5 text-[8px] text-neutral-600 flex justify-between border-t border-neutral-300 mt-0.5">
              <span>Factura Electrónica SIFEN N°: <strong className="text-black font-mono">{invoice.invoiceNumber}</strong></span>
              <span className="font-mono">CDC: {invoice.cdc ? `${invoice.cdc.substring(0, 16)}...` : 'Kuatia 1.5'}</span>
              <span>Nota Remisión N°: <strong className="text-black font-mono">{sale.saleNumber?.replace('VTA-', 'REM-') || '195.413'}</strong></span>
            </div>
          )}
        </div>

        {/* ================= BLOQUE 3: TABLA DE ARTÍCULOS ================= */}
        <div className="flex-1 my-1 border border-black overflow-hidden flex flex-col">
          <table className="w-full border-collapse text-[8px]">
            <thead>
              <tr className="border-b border-black bg-neutral-100 font-bold uppercase text-[7.5px] leading-tight text-black">
                <th className="py-1 px-1 text-left w-16 border-r border-black">CÓDIGO</th>
                <th className="py-1 px-1 text-center w-16 border-r border-black">CANTIDAD</th>
                <th className="py-1 px-1 text-left border-r border-black">DESCRIPCIÓN</th>
                <th className="py-1 px-1 text-right w-20 border-r border-black">P. UNITARIO</th>
                <th className="py-1 px-0 text-center w-40" colSpan={3}>
                  VALOR DE VENTAS
                  <div className="grid grid-cols-3 border-t border-black text-[6.5px] font-normal mt-0.5">
                    <span className="border-r border-black">EXENTAS</span>
                    <span className="border-r border-black">5%</span>
                    <span>10%</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-300 font-mono text-[8px]">
              {sale.items?.slice(0, 5).map((item: any, idx: number) => {
                const isVat10 = item.vatRate === 'IVA_10';
                const isVat5 = item.vatRate === 'IVA_5';
                const isExempt = item.vatRate === 'EXEMPT';

                return (
                  <tr key={item.id || idx} className="leading-tight">
                    <td className="py-1 px-1 border-r border-black font-semibold">
                      {item.product?.sku || item.product?.code || 'ART'}
                    </td>
                    <td className="py-1 px-1 border-r border-black text-center font-bold">
                      {item.quantity} {item.product?.unitOfMeasure || item.product?.unit || 'UN'}
                    </td>
                    <td className="py-1 px-1 border-r border-black font-sans font-medium truncate max-w-[200px]">
                      {item.product?.name || item.product?.description || 'Material de Construcción'}
                    </td>
                    <td className="py-1 px-1 border-r border-black text-right">
                      {formatCurrencyPYG(Number(item.unitPrice))}
                    </td>
                    <td className="py-1 px-1 border-r border-black text-right text-[7.5px]">
                      {isExempt ? formatCurrencyPYG(Number(item.subtotal)) : '-'}
                    </td>
                    <td className="py-1 px-1 border-r border-black text-right text-[7.5px]">
                      {isVat5 ? formatCurrencyPYG(Number(item.subtotal)) : '-'}
                    </td>
                    <td className="py-1 px-1 text-right font-bold text-[7.5px]">
                      {isVat10 ? formatCurrencyPYG(Number(item.subtotal)) : '-'}
                    </td>
                  </tr>
                );
              })}

              {/* Relleno visual si hay pocos artículos para mantener altura */}
              {(sale.items?.length || 0) < 3 && (
                <tr className="h-6">
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black text-center italic text-neutral-400 font-sans text-[7.5px]">
                    *** Fin de detalle de entrega ***
                  </td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ================= BLOQUE 4: TOTALES, MONTO EN LETRAS Y FIRMAS ================= */}
        <div className="border border-black p-1 text-[8px] bg-neutral-50 grid grid-cols-12 gap-1 items-center">
          {/* Son Guaraníes en letras */}
          <div className="col-span-8 font-mono leading-tight">
            <span className="font-bold font-sans">SON GUARANÍES: </span>
            <span className="font-bold uppercase text-[7.5px]">{totalInWords} .-</span>
            <div className="text-[7px] text-neutral-600 mt-0.5">
              Total Artículos: {sale.items?.reduce((acc: number, i: any) => acc + Number(i.quantity || 0), 0) || 0} unidades
            </div>
          </div>

          {/* Total Numérico */}
          <div className="col-span-4 text-right border-l border-black pl-2">
            <div className="text-[7px] uppercase font-bold text-neutral-600">TOTAL A PAGAR GUARANÍES</div>
            <div className="text-xs font-black font-mono text-black">
              {formatCurrencyPYG(totalAmount)}
            </div>
          </div>
        </div>

        {/* Sello y Firmas */}
        <div className="pt-1.5 flex items-end justify-between text-[7.5px] text-neutral-800">
          {/* Sello Pagado / No devoluciones como en la foto */}
          <div className="border border-dashed border-black px-2 py-1 text-center font-mono select-none">
            <div className="font-bold text-[8.5px] tracking-widest text-black">PAGADO</div>
            <div className="text-[6.5px] uppercase">No se aceptan devoluciones sin comprobante</div>
          </div>

          {/* Firma Chofer / Despachador */}
          <div className="text-center w-36">
            <div className="border-t border-black pt-0.5 font-medium">Entregado / Despacho</div>
            <div className="text-[6.5px] text-neutral-600">Depósito 4 de Marzo</div>
          </div>

          {/* Firma Receptor / Cliente */}
          <div className="text-center w-44">
            <div className="border-t border-black pt-0.5 font-medium">Recibí Conforme (Firma y Aclaración)</div>
            <div className="text-[6.5px] text-neutral-600">C.I. N°: ____________________</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="printable-delivery-order" className="bg-white text-black font-sans w-full max-w-[210mm] mx-auto p-2 space-y-2 box-border">
      {/* Copia 1: ORIGINAL (Mitad Superior A4) */}
      <div className="order-copy">
        {renderSingleOrder('ORIGINAL')}
      </div>

      {/* Línea de Corte Perforada para la Hoja A4 */}
      <div className="relative py-1 flex items-center justify-center my-0.5 border-t border-dashed border-neutral-400 no-print">
        <span className="bg-neutral-100 text-neutral-600 font-mono text-[8px] px-2 py-0.5 rounded border border-neutral-300">
          &bull; &bull; &bull; Línea de Corte &bull; Hoja A4 en Duplicado &bull; &bull; &bull;
        </span>
      </div>

      {/* Copia 2: DUPLICADO (Mitad Inferior A4) */}
      <div className="order-copy">
        {renderSingleOrder('DUPLICADO')}
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { formatCurrencyPYG } from '@/shared/utils/currency';

interface AccountStatementA4Props {
  detail: any;
}

export function getOrderProjectLabel(ord: any): string {
  if (ord.project?.name) {
    return ord.project.address
      ? `${ord.project.name} (${ord.project.address})`
      : ord.project.name;
  }
  const addr = ord.customerAddress?.trim();
  if (addr && addr.toLowerCase() !== 'planta' && addr.toLowerCase() !== 'mostrador / planta central') {
    return addr;
  }
  return 'Retiros en Planta / Sin Obra Asignada';
}

export function AccountStatementA4({ detail }: AccountStatementA4Props) {
  if (!detail?.customer) return null;

  const orders: any[] = detail.orders || [];
  const payments: any[] = detail.payments || [];

  // Agrupar órdenes por Obra / Dirección de entrega manteniendo orden cronológico por fecha
  const groupsMap = new Map<string, { label: string; orders: any[]; subtotal: number }>();

  const sortedOrders = [...orders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const ord of sortedOrders) {
    const label = getOrderProjectLabel(ord);
    const existing = groupsMap.get(label) || { label, orders: [], subtotal: 0 };
    existing.orders.push(ord);
    existing.subtotal += Number(ord.grandTotal || 0);
    groupsMap.set(label, existing);
  }

  const projectGroups = Array.from(groupsMap.values());
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const now = new Date();
  const formattedNowDate = now.toLocaleDateString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedNowTime = now.toLocaleTimeString('es-PY', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      id="printable-account-statement-pdf"
      className="w-[210mm] bg-white text-black p-8 font-sans text-xs leading-snug space-y-5"
    >
      {/* Cabecera Oficial */}
      <div className="border-b-2 border-black pb-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-black uppercase tracking-wide text-black">
            Depósito 4 de Marzo
          </h1>
          <p className="text-[11px] font-semibold text-neutral-700">
            Materiales de Construcción &bull; Ferretería Industrial &bull; Hierros en General
          </p>
          <p className="text-[10px] text-neutral-600 font-mono mt-0.5">
            RUC: 80134022-5 &bull; Tel: 0972 465511 &bull; Avda. Defensores del Chaco casi 1ro de Mayo
          </p>
        </div>

        <div className="text-right">
          <div className="inline-block px-2.5 py-1 border border-black bg-neutral-100 font-mono font-bold text-[11px] uppercase">
            Extracto Preliminar de Cuenta
          </div>
          <p className="text-[10px] font-mono text-neutral-700 mt-1">
            Emitido: {formattedNowDate} &bull; {formattedNowTime}
          </p>
        </div>
      </div>

      {/* Datos del Cliente y Resumen de Obras */}
      <div className="p-3 border border-black rounded-sm bg-neutral-50 space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono uppercase text-neutral-600 block">Cliente / Razón Social</span>
            <strong className="text-sm text-black">{detail.customer.name}</strong>
          </div>
          <div className="text-right font-mono">
            <span className="text-[10px] uppercase text-neutral-600 block">RUC / C.I.</span>
            <strong className="text-xs text-black">{detail.customer.ruc}</strong>
          </div>
        </div>
        <div className="pt-1 border-t border-neutral-300 text-[10.5px] text-neutral-700">
          <strong>Obras / Destinos incluidos ({projectGroups.length}):</strong>{' '}
          {projectGroups.length > 0
            ? projectGroups.map((g) => g.label).join('  |  ')
            : detail.customer.address || 'Sin entregas registradas'}
        </div>
      </div>

      {/* Resumen Numérico Global */}
      <div className="grid grid-cols-3 gap-3 font-mono">
        <div className="p-2.5 border border-black rounded-sm">
          <span className="text-[10px] uppercase text-neutral-600 block">Total Entregado</span>
          <strong className="text-sm text-black">{formatCurrencyPYG(Number(detail.totalDelivered || 0))}</strong>
        </div>
        <div className="p-2.5 border border-black rounded-sm">
          <span className="text-[10px] uppercase text-neutral-600 block">Total Abonado / Pagos</span>
          <strong className="text-sm text-emerald-800">{formatCurrencyPYG(Number(detail.totalPaid || 0))}</strong>
        </div>
        <div className="p-2.5 border-2 border-black bg-neutral-100 rounded-sm text-right">
          <span className="text-[10px] uppercase font-bold text-black block">Saldo Total Pendiente</span>
          <strong className="text-base font-black text-black">
            {formatCurrencyPYG(Number(detail.currentBalance || 0))}
          </strong>
        </div>
      </div>

      {/* Desglose Agrupado por Obra y Fecha */}
      <div className="space-y-4">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-black border-b border-black pb-1">
          Desglose de Entregas por Obra y Fecha
        </h2>

        {projectGroups.length === 0 ? (
          <p className="text-xs text-neutral-600 font-mono py-4 text-center">
            No hay despachos a cuenta registrados para este cliente.
          </p>
        ) : (
          projectGroups.map((group, gIdx) => (
            <div key={gIdx} className="border border-black rounded-sm overflow-hidden break-inside-avoid">
              {/* Cabecera de Obra con Subtotal */}
              <div className="bg-neutral-200 px-3 py-2 border-b border-black flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase text-neutral-700 block">
                    Obra / Destino #{gIdx + 1}
                  </span>
                  <strong className="text-xs text-black">{group.label}</strong>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[10px] text-neutral-700 block">
                    {group.orders.length} {group.orders.length === 1 ? 'entrega' : 'entregas'}
                  </span>
                  <strong className="text-xs font-bold text-black">
                    Subtotal Obra: {formatCurrencyPYG(group.subtotal)}
                  </strong>
                </div>
              </div>

              {/* Tabla de Entregas de esta Obra */}
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-neutral-100 border-b border-black font-mono text-[9.5px] uppercase text-neutral-800">
                    <th className="py-1.5 px-2.5 text-left w-24">Fecha</th>
                    <th className="py-1.5 px-2.5 text-left w-28">Comprobante</th>
                    <th className="py-1.5 px-2.5 text-left">Materiales Entregados</th>
                    <th className="py-1.5 px-2.5 text-right w-28">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-300">
                  {group.orders.map((ord) => (
                    <tr key={ord.id}>
                      <td className="py-2 px-2.5 font-mono align-top whitespace-nowrap text-neutral-800">
                        {new Date(ord.createdAt).toLocaleDateString('es-PY', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-2 px-2.5 font-mono align-top whitespace-nowrap">
                        <strong className="text-black block">{ord.saleNumber}</strong>
                        <span className="text-[9px] text-neutral-600">
                          {ord.invoice ? `Fact. ${ord.invoice.invoiceNumber}` : 'Sin factura'}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 align-top text-black">
                        {ord.items && ord.items.length > 0 ? (
                          <ul className="space-y-0.5">
                            {ord.items.map((it: any, idx: number) => (
                              <li key={idx} className="text-[10.5px]">
                                <span className="font-mono font-semibold">
                                  {Number(it.quantity)} {it.product?.unitOfMeasure || ''}
                                </span>{' '}
                                &times; {it.product?.name || 'Producto'}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span>{ord.items?.length || 0} ítems</span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold align-top whitespace-nowrap text-black">
                        {formatCurrencyPYG(Number(ord.grandTotal || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      {/* Pagos / Abonos Parciales */}
      {sortedPayments.length > 0 && (
        <div className="space-y-2 break-inside-avoid">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-black border-b border-black pb-1">
            Pagos y Abonos Registrados
          </h2>
          <table className="w-full border border-black border-collapse text-[11px]">
            <thead>
              <tr className="bg-neutral-100 border-b border-black font-mono text-[9.5px] uppercase text-neutral-800">
                <th className="py-1.5 px-2.5 text-left w-24">Fecha</th>
                <th className="py-1.5 px-2.5 text-left w-32">Recibo</th>
                <th className="py-1.5 px-2.5 text-left">Medio / Observación</th>
                <th className="py-1.5 px-2.5 text-right w-28">Monto Abonado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-300">
              {sortedPayments.map((pay) => (
                <tr key={pay.id}>
                  <td className="py-1.5 px-2.5 font-mono whitespace-nowrap">
                    {new Date(pay.createdAt).toLocaleDateString('es-PY', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-1.5 px-2.5 font-mono font-bold whitespace-nowrap">
                    {pay.receiptNumber}
                  </td>
                  <td className="py-1.5 px-2.5">
                    {pay.paymentMethod?.replace(/_/g, ' ')}
                    {pay.paymentReference ? ` (Ref: ${pay.paymentReference})` : ''}
                    {pay.notes ? ` — ${pay.notes}` : ''}
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-mono font-bold text-emerald-800 whitespace-nowrap">
                    -{formatCurrencyPYG(Number(pay.amount || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pie / Total Final */}
      <div className="border-t-2 border-black pt-3 flex items-center justify-between gap-4">
        <p className="text-[10px] font-mono text-neutral-600 max-w-md">
          Extracto preliminar informativo agrupado por obra/destino para control de cuenta corriente. No válido como comprobante fiscal.
        </p>
        <div className="text-right font-mono">
          <span className="text-[10px] uppercase text-neutral-700 block">Saldo Total Pendiente</span>
          <strong className="text-base font-black text-black">
            {formatCurrencyPYG(Number(detail.currentBalance || 0))}
          </strong>
        </div>
      </div>
    </div>
  );
}

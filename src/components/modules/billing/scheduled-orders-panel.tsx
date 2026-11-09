'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Bell,
  Truck,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Search,
  Printer,
  ChevronRight,
  ShieldCheck,
  X,
  Building2,
  Layers,
} from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { InvoiceDetailModal } from './invoice-detail-modal';
import { useCustomDialog } from '@/components/common/custom-dialog-provider';

export function ScheduledOrdersPanel({ onOrderDispatched }: { onOrderDispatched?: () => void }) {
  const { alert: customAlert } = useCustomDialog();
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'pending' | 'history'>('today');
  const [orders, setOrders] = useState<any[]>([]);
  const [alerts, setAlerts] = useState({ todayCount: 0, totalPendingCount: 0, hasDeliveriesToday: false });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modales
  const [selectedSaleForDetail, setSelectedSaleForDetail] = useState<any | null>(null);
  const [orderToDispatch, setOrderToDispatch] = useState<any | null>(null);

  // Datos para modal de despacho
  const [dispatchDriverId, setDispatchDriverId] = useState('');
  const [dispatchVehiclePlate, setDispatchVehiclePlate] = useState('');
  const [balancePaymentMethod, setBalancePaymentMethod] = useState('EFECTIVO');
  const [balancePaymentRef, setBalancePaymentRef] = useState('');
  const [issueInvoice, setIssueInvoice] = useState(true);
  const [submittingDispatch, setSubmittingDispatch] = useState(false);

  // Listas de choferes y flota
  const [employees, setEmployees] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/billing/scheduled-orders?filter=${filter}`);
      const json = await res.json();
      if (json.success && json.data) {
        setOrders(json.data.orders || []);
        setAlerts(json.data.alerts || { todayCount: 0, totalPendingCount: 0, hasDeliveriesToday: false });
      }
    } catch {
      // Ignorar errores transitorios
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetch('/api/v1/hr/employees')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setEmployees(d.data || []);
      })
      .catch(() => {});

    fetch('/api/v1/logistics/vehicles')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setVehicles(d.data || []);
      })
      .catch(() => {});
  }, []);

  const openDispatchModal = (order: any) => {
    setOrderToDispatch(order);
    setDispatchDriverId(order.driverId || '');
    setDispatchVehiclePlate(order.vehiclePlate || '');
    setBalancePaymentMethod('EFECTIVO');
    setBalancePaymentRef('');
    setIssueInvoice(!order.invoice);
  };

  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToDispatch) return;

    if (balancePaymentMethod === 'TRANSFERENCIA_BANCARIA' && Number(orderToDispatch.balanceDue) > 0 && !balancePaymentRef.trim()) {
      customAlert({
        title: 'Comprobante Requerido',
        message: 'Debe ingresar el número de comprobante SIPAP para registrar el cobro del saldo.',
        variant: 'warning',
      });
      return;
    }

    setSubmittingDispatch(true);
    try {
      const res = await fetch(`/api/v1/billing/scheduled-orders/${orderToDispatch.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: dispatchDriverId || null,
          vehiclePlate: dispatchVehiclePlate || null,
          balancePaymentMethod,
          balancePaymentReference: balancePaymentRef.trim() || null,
          issueInvoice,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setOrderToDispatch(null);
        fetchOrders();
        if (onOrderDispatched) onOrderDispatched();
        // Abrir visor de comprobante final de entrega
        setSelectedSaleForDetail(json.data);
      } else {
        customAlert({
          title: 'Error de Despacho',
          message: json.error?.message || 'No se pudo procesar el despacho del pedido.',
          variant: 'danger',
        });
      }
    } finally {
      setSubmittingDispatch(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      o.saleNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerRuc.toLowerCase().includes(q) ||
      (o.reservationReceiptNumber && o.reservationReceiptNumber.toLowerCase().includes(q))
    );
  });

  const totalBalanceDue = filteredOrders.reduce((sum, o) => sum + Number(o.balanceDue || 0), 0);
  const totalGrandTotal = filteredOrders.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);

  return (
    <div className="space-y-4">
      {/* ================= ALERTA DESTACADA DE PEDIDOS PARA HOY ================= */}
      {alerts.hasDeliveriesToday && (
        <div className="p-4 rounded-xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-amber-500/20 text-amber-400 shrink-0">
              <Bell className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                ¡Alerta de Entregas! Tienes <strong className="text-amber-400">{alerts.todayCount} pedido{alerts.todayCount > 1 ? 's' : ''}</strong> programado{alerts.todayCount > 1 ? 's' : ''} para despachar HOY
              </h2>
              <p className="text-xs text-muted-foreground font-sans mt-0.5">
                Verifica el camión, asigna el chofer y cobra el saldo contra entrega antes de bajar los materiales en obra.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFilter('today')}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs font-mono flex items-center gap-1.5 shadow self-start sm:self-auto shrink-0"
          >
            <span>Ver Pedidos de Hoy</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ================= BARRA DE FILTROS & TABS ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-card-border p-3.5 rounded-xl">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setFilter('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filter === 'today'
                ? 'bg-amber-500 text-black shadow-md'
                : 'bg-[#0d121c] text-muted-foreground hover:text-foreground border border-card-border'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Para Entregar Hoy</span>
            {alerts.todayCount > 0 && (
              <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded-full font-bold">
                {alerts.todayCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilter('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filter === 'upcoming'
                ? 'bg-primary text-white shadow-md'
                : 'bg-[#0d121c] text-muted-foreground hover:text-foreground border border-card-border'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Próximas Fechas</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filter === 'pending'
                ? 'bg-primary text-white shadow-md'
                : 'bg-[#0d121c] text-muted-foreground hover:text-foreground border border-card-border'
            }`}
          >
            <span>Todos los Pendientes</span>
            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.2 rounded-full font-mono">
              {alerts.totalPendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filter === 'history'
                ? 'bg-primary text-white shadow-md'
                : 'bg-[#0d121c] text-muted-foreground hover:text-foreground border border-card-border'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Historial Entregados</span>
          </button>
        </div>

        {/* Buscador */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar cliente, RUC o N°..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d121c] border border-card-border rounded-md pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* ================= RESUMEN DE SALDOS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-card border border-card-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Pedidos en la Vista</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground">{filteredOrders.length}</div>
          <span className="text-[10px] text-muted-foreground font-mono">Cargados en el sistema</span>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-card-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Total Mercadería Reservada</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">{formatCurrencyPYG(totalGrandTotal)}</div>
          <span className="text-[10px] text-muted-foreground font-mono">Valor total de las notas de pedido</span>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-card-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Saldo a Cobrar Contra Entrega</span>
            <DollarSign className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl font-bold font-mono text-red-400">{formatCurrencyPYG(totalBalanceDue)}</div>
          <span className="text-[10px] text-muted-foreground font-mono">Dinero pendiente de cobro en obra</span>
        </div>
      </div>

      {/* ================= TABLA DE PEDIDOS PROGRAMADOS ================= */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#090d16] border-b border-card-border text-[11px] font-mono uppercase text-muted-foreground">
              <tr>
                <th className="py-2.5 px-3">Pedido / Reserva</th>
                <th className="py-2.5 px-3">Fecha Entrega & Turno</th>
                <th className="py-2.5 px-3">Cliente & Destino</th>
                <th className="py-2.5 px-3">Materiales Reservados</th>
                <th className="py-2.5 px-3 text-right">Total Pedido</th>
                <th className="py-2.5 px-3 text-right">Seña Abonada</th>
                <th className="py-2.5 px-3 text-right">Saldo en Obra</th>
                <th className="py-2.5 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border font-mono text-muted-foreground">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground font-mono">
                    Cargando pedidos programados...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground font-mono">
                    No se encontraron pedidos programados para el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isDelivered = order.deliveryStatus === 'DELIVERED';
                  const dateStr = order.scheduledDeliveryDate
                    ? new Date(order.scheduledDeliveryDate).toLocaleDateString('es-PY', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : 'Sin fecha';

                  return (
                    <tr key={order.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-foreground">{order.saleNumber}</div>
                        {order.reservationReceiptNumber && (
                          <div className="text-[10px] text-amber-400 font-mono">
                            {order.reservationReceiptNumber}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-bold text-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-400" />
                          <span>{dateStr}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-sans">
                          {order.deliveryTimeSlot || 'Jornada habitual'}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-sans">
                        <div className="font-semibold text-foreground">{order.customerName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          RUC: {order.customerRuc}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-xs">
                          {order.customerAddress || order.project?.address || 'Mostrador'}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="space-y-0.5 max-w-xs text-[11px]">
                          {order.items?.slice(0, 2).map((item: any, idx: number) => (
                            <div key={idx} className="truncate text-foreground font-sans">
                              &bull; <strong className="font-mono">{item.quantity} {item.product?.unitOfMeasure}</strong> {item.product?.name}
                            </div>
                          ))}
                          {order.items?.length > 2 && (
                            <div className="text-[10px] text-muted-foreground italic">
                              + {order.items.length - 2} ítem(s) más...
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-foreground">
                        {formatCurrencyPYG(Number(order.grandTotal))}
                      </td>

                      <td className="py-2.5 px-3 text-right text-emerald-400 font-medium">
                        {formatCurrencyPYG(Number(order.downPayment || 0))}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        {Number(order.balanceDue) > 0 ? (
                          <span className="font-extrabold text-red-400 text-xs">
                            {formatCurrencyPYG(Number(order.balanceDue))}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            100% Pagado
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isDelivered ? (
                            <button
                              type="button"
                              onClick={() => openDispatchModal(order)}
                              className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] shadow-sm flex items-center gap-1 transition-colors"
                              title="Despachar mercadería y cobrar saldo en obra"
                            >
                              <Truck className="w-3 h-3" />
                              <span>Despachar</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-mono bg-muted/20 px-2 py-0.5 rounded">
                              Entregado
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedSaleForDetail(order)}
                            className="p-1 rounded bg-[#0d121c] border border-card-border hover:border-primary text-muted-foreground hover:text-foreground transition-colors"
                            title="Ver e imprimir comprobante A4"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL DE DESPACHO Y COBRO DE SALDO ================= */}
      {orderToDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-card border border-card-border rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-card-border bg-[#0b0e14] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-foreground">
                  Despachar Pedido Programado: {orderToDispatch.saleNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOrderToDispatch(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDispatch} className="p-4 space-y-3.5 text-xs font-sans">
              <div className="p-2.5 rounded-lg bg-[#0d121c] border border-card-border font-mono text-[11px] space-y-0.5">
                <div>Cliente: <strong className="text-foreground">{orderToDispatch.customerName}</strong> ({orderToDispatch.customerRuc})</div>
                <div className="text-muted-foreground text-[10px]">
                  Destino: {orderToDispatch.customerAddress || 'Planta'}
                </div>
              </div>

              {/* Liquidación de Saldo */}
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 font-mono space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Mercadería:</span>
                  <span>{formatCurrencyPYG(Number(orderToDispatch.grandTotal))}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Seña ya abonada:</span>
                  <span>-{formatCurrencyPYG(Number(orderToDispatch.downPayment || 0))}</span>
                </div>
                <div className="flex justify-between font-bold text-foreground text-sm pt-1 border-t border-amber-500/20">
                  <span>Saldo a Cobrar Contra Entrega:</span>
                  <span className="text-red-400">{formatCurrencyPYG(Number(orderToDispatch.balanceDue))}</span>
                </div>
              </div>

              {Number(orderToDispatch.balanceDue) > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-mono text-muted-foreground mb-1">Medio de Cobro Saldo</label>
                    <select
                      value={balancePaymentMethod}
                      onChange={(e) => setBalancePaymentMethod(e.target.value)}
                      className="w-full bg-[#0d121c] border border-card-border rounded px-2 py-1.5 text-foreground font-mono"
                    >
                      <option value="EFECTIVO">Efectivo (Entra a caja)</option>
                      <option value="TRANSFERENCIA_BANCARIA">Transferencia SIPAP</option>
                      <option value="CHEQUE">Cheque al Día</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-muted-foreground mb-1">N° Comprobante SIPAP</label>
                    <input
                      type="text"
                      value={balancePaymentRef}
                      onChange={(e) => setBalancePaymentRef(e.target.value)}
                      placeholder={balancePaymentMethod === 'TRANSFERENCIA_BANCARIA' ? 'Obligatorio' : 'Opcional'}
                      className="w-full bg-[#0d121c] border border-card-border rounded px-2 py-1.5 text-foreground font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Asignación de Chofer y Camión */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">Chofer Asignado</label>
                  <select
                    value={dispatchDriverId}
                    onChange={(e) => setDispatchDriverId(e.target.value)}
                    className="w-full bg-[#0d121c] border border-card-border rounded px-2 py-1.5 text-foreground"
                  >
                    <option value="">(Seleccionar Chofer)</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">Camión / Chapa</label>
                  <select
                    value={dispatchVehiclePlate}
                    onChange={(e) => setDispatchVehiclePlate(e.target.value)}
                    className="w-full bg-[#0d121c] border border-card-border rounded px-2 py-1.5 text-foreground font-mono"
                  >
                    <option value="">(Seleccionar Vehículo)</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.plateNumber}>
                        {v.brand} {v.model} ({v.plateNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Facturación Fiscal */}
              {!orderToDispatch.invoice && (
                <div className="p-2.5 rounded bg-[#0d121c] border border-card-border flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-foreground block">Emitir Factura Electrónica SIFEN</span>
                    <span className="text-[10px] text-muted-foreground">Genera el DTE oficial ante la DNIT con IVA 10%.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={issueInvoice}
                    onChange={(e) => setIssueInvoice(e.target.checked)}
                    className="w-4 h-4 rounded text-primary accent-primary"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setOrderToDispatch(null)}
                  className="px-3 py-1.5 rounded border border-card-border text-muted-foreground hover:bg-muted/20"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingDispatch}
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{submittingDispatch ? 'Despachando...' : 'Confirmar Despacho y Entrega'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visor de comprobante */}
      {selectedSaleForDetail && (
        <InvoiceDetailModal
          sale={selectedSaleForDetail}
          isOpen={!!selectedSaleForDetail}
          onClose={() => setSelectedSaleForDetail(null)}
        />
      )}
    </div>
  );
}


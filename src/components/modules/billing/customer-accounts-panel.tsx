'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  DollarSign,
  Plus,
  Receipt,
  Search,
  CheckCircle2,
  Calendar,
  CreditCard,
  FileText,
  Clock,
  Printer,
  ChevronRight,
  AlertCircle,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { useCustomDialog } from '@/components/common/custom-dialog-provider';

interface CustomerAccountSummary {
  customerRuc: string;
  customerName: string;
  customerAddress: string | null;
  totalDelivered: number;
  totalPaid: number;
  currentBalance: number;
  ordersCount: number;
  paymentsCount: number;
  lastActivity: string;
}

export function CustomerAccountsPanel({
  onViewInvoice,
}: {
  onViewInvoice: (sale: any) => void;
}) {
  const { alert: customAlert } = useCustomDialog();
  const [accounts, setAccounts] = useState<CustomerAccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRuc, setSelectedRuc] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal: Registrar Pago a Cuenta (Entrega de Viernes)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<{ ruc: string; name: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA_BANCARIA' | 'CHEQUE'>('EFECTIVO');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Modal: Facturar Fin de Mes (SIFEN)
  const [showInvoiceMonthModal, setShowInvoiceMonthModal] = useState(false);
  const [invoiceCustomer, setInvoiceCustomer] = useState<{ ruc: string; name: string; address?: string } | null>(null);
  const [invoiceAmount, setInvoiceAmount] = useState<string>('');
  const [invoiceDescription, setInvoiceDescription] = useState<string>('');
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA_BANCARIA'>('EFECTIVO');
  const [invoicePaymentReference, setInvoicePaymentReference] = useState('');
  const [submittingInvoice, setSubmittingInvoice] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/billing/customer-accounts');
      const json = await res.json();
      if (json.success) {
        setAccounts(json.data || []);
      }
    } catch {
      // Ignorar errores transitorios
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (ruc: string) => {
    setSelectedRuc(ruc);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/v1/billing/customer-accounts?ruc=${encodeURIComponent(ruc)}`);
      const json = await res.json();
      if (json.success) {
        setSelectedDetail(json.data);
      }
    } catch {
      // Ignorar
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Calcular descripción mensual por defecto
  const getDefaultMonthDescription = () => {
    const now = new Date();
    const MESES = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    return `MATERIALES DE CONSTRUCCIÓN VARIOS SEGÚN ÓRDENES DE ENTREGA DEL MES DE ${MESES[now.getMonth()]} ${now.getFullYear()}`;
  };

  // Abrir Modal de Cobro
  const openPaymentModal = (acc: { customerRuc: string; customerName: string; currentBalance?: number }) => {
    setPaymentCustomer({ ruc: acc.customerRuc, name: acc.customerName });
    setPaymentAmount(acc.currentBalance && acc.currentBalance > 0 ? String(acc.currentBalance) : '');
    setPaymentMethod('EFECTIVO');
    setPaymentReference('');
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  // Abrir Modal de Facturación de Fin de Mes
  const openInvoiceMonthModal = (acc: { customerRuc: string; customerName: string; currentBalance?: number; customerAddress?: string | null }) => {
    setInvoiceCustomer({ ruc: acc.customerRuc, name: acc.customerName, address: acc.customerAddress || undefined });
    setInvoiceAmount(acc.currentBalance && acc.currentBalance > 0 ? String(acc.currentBalance) : '');
    setInvoiceDescription(getDefaultMonthDescription());
    setInvoicePaymentMethod('EFECTIVO');
    setInvoicePaymentReference('');
    setShowInvoiceMonthModal(true);
  };

  // Enviar Pago a Cuenta
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer || !paymentAmount || Number(paymentAmount) <= 0) {
      customAlert({
        title: 'Monto Inválido',
        message: 'Debe ingresar un monto mayor a 0 para el cobro.',
        variant: 'warning',
      });
      return;
    }

    if (paymentMethod === 'TRANSFERENCIA_BANCARIA' && !paymentReference.trim()) {
      customAlert({
        title: 'Comprobante Requerido',
        message: 'Debe ingresar el número de comprobante de la transferencia.',
        variant: 'warning',
      });
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await fetch('/api/v1/billing/customer-accounts/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerRuc: paymentCustomer.ruc,
          customerName: paymentCustomer.name,
          amount: Number(paymentAmount),
          paymentMethod,
          paymentReference: paymentReference.trim() || null,
          notes: paymentNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowPaymentModal(false);
        customAlert({
          title: 'Cobro Registrado con Éxito',
          message: `Se registró la entrega de ${formatCurrencyPYG(Number(paymentAmount))} para ${paymentCustomer.name}. El monto ingresó a la caja activa del día.`,
          variant: 'success',
        });
        fetchAccounts();
        if (selectedRuc) fetchDetail(selectedRuc);
      } else {
        customAlert({
          title: 'Error al Registrar Cobro',
          message: data.error?.message || 'No se pudo guardar el pago a cuenta.',
          variant: 'danger',
        });
      }
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Enviar Facturación de Fin de Mes
  const handleSaveInvoiceMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceCustomer || !invoiceAmount || Number(invoiceAmount) <= 0) {
      customAlert({
        title: 'Monto Inválido',
        message: 'Debe ingresar un monto a facturar mayor a 0.',
        variant: 'warning',
      });
      return;
    }

    setSubmittingInvoice(true);
    try {
      const res = await fetch('/api/v1/billing/customer-accounts/invoice-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerRuc: invoiceCustomer.ruc,
          customerName: invoiceCustomer.name,
          customerAddress: invoiceCustomer.address,
          amount: Number(invoiceAmount),
          paymentMethod: invoicePaymentMethod,
          paymentReference: invoicePaymentReference.trim() || null,
          customDescription: invoiceDescription.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowInvoiceMonthModal(false);
        customAlert({
          title: 'Factura SIFEN Emitida con Éxito',
          message: `Se emitió la factura electrónica por ${formatCurrencyPYG(Number(invoiceAmount))} con la descripción solicitada.`,
          variant: 'success',
        });
        fetchAccounts();
        if (selectedRuc) fetchDetail(selectedRuc);
        // Abrir el visor de la factura emitida para imprimir
        onViewInvoice(data.data);
      } else {
        customAlert({
          title: 'Error al Facturar',
          message: data.error?.message || 'No se pudo emitir la factura mensual.',
          variant: 'danger',
        });
      }
    } finally {
      setSubmittingInvoice(false);
    }
  };

  // Filtrado de cuentas
  const filteredAccounts = accounts.filter(
    (a) =>
      a.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.customerRuc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalGlobalDebt = accounts.reduce((sum, a) => sum + (a.currentBalance > 0 ? a.currentBalance : 0), 0);
  const totalGlobalPaid = accounts.reduce((sum, a) => sum + a.totalPaid, 0);

  return (
    <div className="space-y-4">
      {/* Tarjetas KPI de Cuentas Corrientes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-lg bg-card border border-card-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Saldo Deudor en Cuentas Corrientes</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {formatCurrencyPYG(totalGlobalDebt)}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            {accounts.filter((a) => a.currentBalance > 0).length} clientes con saldo pendiente
          </span>
        </div>

        <div className="p-4 rounded-lg bg-card border border-card-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Total Cobrado en Entregas (Abonos)</span>
            <Receipt className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {formatCurrencyPYG(totalGlobalPaid)}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            Ingresado a caja en entregas semanales
          </span>
        </div>

        <div className="p-4 rounded-lg bg-card border border-card-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Modalidad Operativa</span>
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <div className="text-sm font-bold font-mono text-foreground">Libreta de Obra Activa</div>
          <span className="text-[10px] text-muted-foreground font-mono">
            Despachos a cuenta con pago semanal
          </span>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtro */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-lg border border-card-border">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente o RUC (ej: César, 44444401)..."
            className="w-full bg-[#0d121c] border border-card-border rounded-md pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono"
          />
        </div>

        <button
          type="button"
          onClick={fetchAccounts}
          className="text-xs font-mono text-primary hover:underline flex items-center gap-1"
        >
          <span>Actualizar Saldos</span>
        </button>
      </div>

      {/* Contenido Principal: Listado y Detalle Dividido */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Lista de Clientes con Cuenta Corriente (Izquierda) */}
        <div className={`${selectedRuc ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-2`}>
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground font-mono">
              Cargando cuentas corrientes...
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="p-8 text-center bg-card border border-card-border rounded-lg text-xs text-muted-foreground font-mono">
              No hay pedidos a cuenta registrados todavía. Cuando cargues un pedido en el POS bajo la condición &quot;A Cuenta / Libreta&quot;, aparecerá aquí automáticamente.
            </div>
          ) : (
            filteredAccounts.map((acc) => {
              const isSelected = selectedRuc === acc.customerRuc;

              return (
                <div
                  key={acc.customerRuc}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#101726] border-primary shadow-md'
                      : 'bg-card border-card-border hover:border-card-border/80'
                  }`}
                  onClick={() => fetchDetail(acc.customerRuc)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{acc.customerName}</h4>
                      <p className="text-[10px] font-mono text-muted-foreground">RUC: {acc.customerRuc}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-mono text-muted-foreground uppercase block">
                        Saldo Pendiente
                      </span>
                      <span
                        className={`text-sm font-mono font-bold ${
                          acc.currentBalance > 0
                            ? 'text-amber-400'
                            : acc.currentBalance === 0
                            ? 'text-muted-foreground'
                            : 'text-emerald-400'
                        }`}
                      >
                        {formatCurrencyPYG(acc.currentBalance)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-card-border/50 text-[10px] font-mono text-muted-foreground">
                    <div>
                      <span className="block text-[8.5px]">Total Pedidos</span>
                      <span className="text-foreground font-semibold">{formatCurrencyPYG(acc.totalDelivered)}</span>
                    </div>
                    <div>
                      <span className="block text-[8.5px]">Total Abonado</span>
                      <span className="text-emerald-400 font-semibold">{formatCurrencyPYG(acc.totalPaid)}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[8.5px]">Movimientos</span>
                      <span>{acc.ordersCount} ped. &bull; {acc.paymentsCount} pagos</span>
                    </div>
                  </div>

                  {/* Acciones Rápidas */}
                  <div className="flex items-center justify-end gap-2 mt-2.5 pt-2 border-t border-card-border/40">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPaymentModal(acc);
                      }}
                      className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-medium flex items-center gap-1 transition-colors"
                      title="Registrar entrega o pago a cuenta del cliente"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Pago a Cuenta</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openInvoiceMonthModal(acc);
                      }}
                      className="px-2.5 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 text-[10px] font-mono font-medium flex items-center gap-1 transition-colors"
                      title="Facturar fin de mes con descripción consolidada"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>Facturar Fin de Mes</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detalle del Estado de Cuenta / Extracto (Derecha) */}
        {selectedRuc && (
          <div className="lg:col-span-7 bg-card border border-card-border rounded-lg p-4 space-y-4">
            {loadingDetail ? (
              <div className="p-8 text-center text-xs text-muted-foreground font-mono">
                Cargando extracto del cliente...
              </div>
            ) : selectedDetail ? (
              <>
                {/* Cabecera del Cliente */}
                <div className="flex items-start justify-between pb-3 border-b border-card-border">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {selectedDetail.customer?.name}
                    </h3>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      RUC: {selectedDetail.customer?.ruc} &bull; {selectedDetail.customer?.address || 'Planta / Mostrador'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openPaymentModal({
                          customerRuc: selectedDetail.customer.ruc,
                          customerName: selectedDetail.customer.name,
                          currentBalance: selectedDetail.currentBalance,
                        })
                      }
                      className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Registrar Cobro</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openInvoiceMonthModal({
                          customerRuc: selectedDetail.customer.ruc,
                          customerName: selectedDetail.customer.name,
                          currentBalance: selectedDetail.currentBalance,
                          customerAddress: selectedDetail.customer.address,
                        })
                      }
                      className="px-3 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 shadow-md"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Facturar Fin de Mes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRuc(null)}
                      className="p-1.5 rounded text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Resumen del Saldo */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-[#0d121c] border border-card-border font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Total Entregado</span>
                    <span className="font-bold text-foreground">{formatCurrencyPYG(selectedDetail.totalDelivered)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Total Abonado</span>
                    <span className="font-bold text-emerald-400">{formatCurrencyPYG(selectedDetail.totalPaid)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block">Saldo Actual</span>
                    <span className="font-black text-amber-400 text-sm">{formatCurrencyPYG(selectedDetail.currentBalance)}</span>
                  </div>
                </div>

                {/* Movimientos Históricos Tipo Extracto */}
                <div className="space-y-2">
                  <h4 className="text-xs font-mono uppercase font-semibold text-muted-foreground">
                    Historial de Despachos y Entregas de Dinero
                  </h4>

                  <div className="border border-card-border rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-[#0d121c] text-[10px] font-mono uppercase text-muted-foreground border-b border-card-border">
                        <tr>
                          <th className="py-2 px-3">Fecha</th>
                          <th className="py-2 px-3">Concepto / Comprobante</th>
                          <th className="py-2 px-3 text-right">Debe (Retiros)</th>
                          <th className="py-2 px-3 text-right">Haber (Pagos)</th>
                          <th className="py-2 px-3 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-card-border font-mono text-[11px]">
                        {/* Órdenes de Entrega */}
                        {selectedDetail.orders?.map((ord: any) => (
                          <tr key={ord.id} className="hover:bg-muted/10">
                            <td className="py-2 px-3 text-muted-foreground">
                              {new Date(ord.createdAt).toLocaleDateString('es-PY')}
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-bold text-foreground flex items-center gap-1">
                                <ArrowUpRight className="w-3 h-3 text-amber-400" />
                                {ord.saleNumber}
                              </span>
                              <span className="text-[10px] text-muted-foreground block font-sans">
                                {ord.items?.length || 0} ítems &bull; {ord.invoice ? 'Facturado SIFEN' : 'Orden sin facturar'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-amber-400">
                              {formatCurrencyPYG(Number(ord.grandTotal))}
                            </td>
                            <td className="py-2 px-3 text-right text-muted-foreground">-</td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => onViewInvoice(ord)}
                                className="text-[10px] text-primary hover:underline"
                              >
                                Ver Orden
                              </button>
                            </td>
                          </tr>
                        ))}

                        {/* Pagos / Entregas de Viernes */}
                        {selectedDetail.payments?.map((pay: any) => (
                          <tr key={pay.id} className="bg-emerald-500/5 hover:bg-emerald-500/10">
                            <td className="py-2 px-3 text-muted-foreground">
                              {new Date(pay.createdAt).toLocaleDateString('es-PY')}
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-bold text-emerald-400 flex items-center gap-1">
                                <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                                Pago a Cuenta &bull; {pay.receiptNumber}
                              </span>
                              <span className="text-[10px] text-muted-foreground block font-sans">
                                {pay.paymentMethod.replace(/_/g, ' ')}
                                {pay.paymentReference ? ` (Ref: ${pay.paymentReference})` : ''}
                                {pay.notes ? ` - "${pay.notes}"` : ''}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right text-muted-foreground">-</td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-400">
                              {formatCurrencyPYG(Number(pay.amount))}
                            </td>
                            <td className="py-2 px-3 text-center text-muted-foreground text-[10px]">
                              Recibo
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* ================= MODAL 1: REGISTRAR PAGO A CUENTA (COBRO DE VIERNES) ================= */}
      {showPaymentModal && paymentCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-card border border-card-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-card-border bg-[#0b0e14] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-foreground">
                  Registrar Cobro / Pago a Cuenta
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-4 space-y-3.5 text-xs font-sans">
              <div className="p-2.5 rounded-lg bg-[#0d121c] border border-card-border font-mono text-[11px]">
                <div className="text-muted-foreground">Cliente: <strong className="text-foreground">{paymentCustomer.name}</strong></div>
                <div className="text-muted-foreground text-[10px]">RUC: {paymentCustomer.ruc}</div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                  Monto Entregado (Gs.) *
                </label>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Ej: 300000"
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-2 text-foreground font-mono text-sm font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">Medio de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                    className="w-full bg-[#0d121c] border border-card-border rounded-md px-2 py-1.5 text-foreground"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA_BANCARIA">Transferencia SIPAP</option>
                    <option value="CHEQUE">Cheque al Día</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                    N° Comprobante / Ref.
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder={paymentMethod === 'TRANSFERENCIA_BANCARIA' ? 'Obligatorio SIPAP' : 'Opcional'}
                    className="w-full bg-[#0d121c] border border-card-border rounded-md px-2 py-1.5 text-foreground font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                  Observación / Nota (Opcional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Ej: Entrega viernes semana 1 de obra"
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 font-mono">
                &bull; El dinero ingresa automáticamente a la caja activa del día para el arqueo.
                <br />
                &bull; El saldo del cliente disminuye en el acto.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-1.5 rounded-md border border-card-border text-muted-foreground hover:bg-muted/20"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-md"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{submittingPayment ? 'Guardando...' : 'Confirmar Cobro'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: FACTURAR FIN DE MES (SIFEN) ================= */}
      {showInvoiceMonthModal && invoiceCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-card border border-card-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-card-border bg-[#0b0e14] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Emitir Factura Electrónica SIFEN (Fin de Mes)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInvoiceMonthModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoiceMonth} className="p-5 space-y-4 text-xs font-sans">
              <div className="p-3 rounded-lg bg-[#0d121c] border border-card-border font-mono text-[11px] space-y-0.5">
                <div className="text-muted-foreground">Cliente Receptor: <strong className="text-foreground">{invoiceCustomer.name}</strong></div>
                <div className="text-muted-foreground text-[10px]">RUC: {invoiceCustomer.ruc}</div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                  Monto Total a Facturar (Gs.) *
                </label>
                <input
                  type="number"
                  required
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  placeholder="Ej: 600000"
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-2 text-foreground font-mono text-sm font-bold focus:outline-none focus:border-primary"
                />
              </div>

              {/* Descripción Solicitada */}
              <div>
                <label className="block text-[11px] font-mono font-semibold text-primary mb-1">
                  Descripción Oficial del Ítem en la Factura SIFEN *
                </label>
                <textarea
                  required
                  rows={2}
                  value={invoiceDescription}
                  onChange={(e) => setInvoiceDescription(e.target.value)}
                  className="w-full bg-[#0d121c] border border-primary/40 rounded-md p-2.5 text-foreground font-mono text-[11px] focus:outline-none focus:border-primary uppercase"
                />
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                  Se emitirá como IVA 10% y generará comprobante electrónico con CDC oficial.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">Forma de Pago</label>
                  <select
                    value={invoicePaymentMethod}
                    onChange={(e: any) => setInvoicePaymentMethod(e.target.value)}
                    className="w-full bg-[#0d121c] border border-card-border rounded-md px-2 py-1.5 text-foreground"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA_BANCARIA">Transferencia SIPAP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                    N° Comprobante Ref.
                  </label>
                  <input
                    type="text"
                    value={invoicePaymentReference}
                    onChange={(e) => setInvoicePaymentReference(e.target.value)}
                    placeholder="Opcional"
                    className="w-full bg-[#0d121c] border border-card-border rounded-md px-2 py-1.5 text-foreground font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowInvoiceMonthModal(false)}
                  className="px-3 py-1.5 rounded-md border border-card-border text-muted-foreground hover:bg-muted/20"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingInvoice}
                  className="px-4 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white font-semibold flex items-center gap-1.5 shadow-md"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{submittingInvoice ? 'Emitiendo en DNIT...' : 'Emitir Factura SIFEN'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


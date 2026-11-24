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
  FileDown,
  MessageCircle,
  Loader2,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { useCustomDialog } from '@/components/common/custom-dialog-provider';
import { downloadElementAsPdf, openWhatsAppShareWindow } from '@/shared/utils/pdf-export';
import { AccountStatementA4, getOrderProjectLabel } from './account-statement-a4';

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

interface CancelledOrderAudit {
  id: string;
  saleNumber: string;
  customerName: string;
  customerRuc: string;
  grandTotal: number;
  createdAt: string;
  cancelledAt: string;
  deliveryNotes: string;
  items: Array<{
    name: string;
    sku: string;
    unitOfMeasure: string;
    quantity: number;
  }>;
}

export function CustomerAccountsPanel({
  onViewInvoice,
  isCashShiftOpen,
  onGoToShifts,
}: {
  onViewInvoice: (sale: any) => void;
  isCashShiftOpen?: boolean | null;
  onGoToShifts?: () => void;
}) {
  const { alert: customAlert } = useCustomDialog();
  const [accounts, setAccounts] = useState<CustomerAccountSummary[]>([]);
  const [cancelledOrders, setCancelledOrders] = useState<CancelledOrderAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState<'pending' | 'settled' | 'cancelled'>('pending');
  const [selectedRuc, setSelectedRuc] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal: Anular / Eliminar Pedido en Libreta (habilitado para todo mostrador, con auditoría)
  const [orderToCancel, setOrderToCancel] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState(false);

  // Modal: Registrar Pago a Cuenta (Total Sin Factura o Abono Parcial)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'full_no_invoice' | 'partial'>('full_no_invoice');
  const [paymentCustomer, setPaymentCustomer] = useState<{ ruc: string; name: string; currentBalance?: number } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA_BANCARIA' | 'CHEQUE'>('EFECTIVO');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Modal: Facturar Fin de Mes / Saldar con Factura (SIFEN)
  const [showInvoiceMonthModal, setShowInvoiceMonthModal] = useState(false);
  const [invoiceCustomer, setInvoiceCustomer] = useState<{
    ruc: string;
    name: string;
    address?: string;
    currentBalance?: number;
  } | null>(null);
  const [invoiceAmount, setInvoiceAmount] = useState<string>('');
  const [invoiceDescription, setInvoiceDescription] = useState<string>('');
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA_BANCARIA'>('EFECTIVO');
  const [invoicePaymentReference, setInvoicePaymentReference] = useState('');
  const [settleBalanceOnInvoice, setSettleBalanceOnInvoice] = useState(true);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [exportingAccountPdf, setExportingAccountPdf] = useState(false);

  const handleDownloadStatementPdf = async (alsoWhatsApp = false) => {
    if (!selectedDetail?.customer) return;
    setExportingAccountPdf(true);
    try {
      const safeName = `Estado_Cuenta_${selectedDetail.customer.name || selectedDetail.customer.ruc}`;
      await downloadElementAsPdf('printable-account-statement-pdf', {
        fileName: safeName,
        paperSize: 'A4',
        lightMode: false,
      });
      if (alsoWhatsApp) {
        const msg = [
          `Depósito 4 de Marzo - Extracto Preliminar de Cuenta`,
          `Cliente: ${selectedDetail.customer.name} (${selectedDetail.customer.ruc})`,
          `Saldo pendiente: ${formatCurrencyPYG(selectedDetail.currentBalance)}`,
          `Adjunto el extracto detallado por obra y fecha en PDF.`,
        ].join('\n');
        openWhatsAppShareWindow(msg, selectedDetail.customer.phone);
      }
    } finally {
      setExportingAccountPdf(false);
    }
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/billing/customer-accounts');
      const json = await res.json();
      if (json.success) {
        const nextAccounts = Array.isArray(json.data) ? json.data : json.data?.accounts || [];
        const nextCancelled = Array.isArray(json.data) ? [] : json.data?.cancelledOrders || [];
        setAccounts(nextAccounts);
        setCancelledOrders(nextCancelled);
      }
    } catch {
      // Ignorar errores transitorios
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToCancel) return;
    setCancellingOrder(true);
    try {
      const res = await fetch(`/api/v1/billing/sales/${orderToCancel.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() || 'Pedido cancelado o no entregado en libreta' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const cancelledSaleNumber = orderToCancel.saleNumber;
        setOrderToCancel(null);
        setCancelReason('');
        await Promise.all([
          fetchAccounts(),
          selectedRuc ? fetchDetail(selectedRuc) : Promise.resolve(),
        ]);
        customAlert({
          title: 'Pedido Anulado y Stock Devuelto',
          message: `El pedido ${cancelledSaleNumber} fue anulado de la libreta. Todos los productos volvieron al inventario y el registro quedó guardado en Auditoría (pestaña Anulados, Historial de Ventas y Kardex).`,
          variant: 'success',
        });
      } else {
        customAlert({
          title: 'No se pudo anular el pedido',
          message: json.error?.message || 'Error al anular el pedido de libreta.',
          variant: 'danger',
        });
      }
    } catch {
      customAlert({
        title: 'Error de conexión',
        message: 'No se pudo conectar con el servidor para anular el pedido.',
        variant: 'danger',
      });
    } finally {
      setCancellingOrder(false);
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

  // Abrir Modal de Cobro (Pago Total Sin Factura o Abono Parcial)
  const openPaymentModal = (
    acc: { customerRuc: string; customerName: string; currentBalance?: number },
    mode: 'full_no_invoice' | 'partial' = 'full_no_invoice'
  ) => {
    if (isCashShiftOpen === false) {
      customAlert({
        title: 'Caja del Día Cerrada',
        message: 'Debe abrir el turno de caja en "Control de Cajas" antes de cobrar o registrar pagos en libreta.',
        variant: 'warning',
      });
      return;
    }
    const balance = acc.currentBalance && acc.currentBalance > 0 ? acc.currentBalance : 0;
    setPaymentMode(mode);
    setPaymentCustomer({ ruc: acc.customerRuc, name: acc.customerName, currentBalance: balance });
    setPaymentAmount(mode === 'full_no_invoice' && balance > 0 ? String(balance) : '');
    setPaymentMethod('EFECTIVO');
    setPaymentReference('');
    setPaymentNotes(mode === 'full_no_invoice' ? 'Pago total por monto en libreta (sin factura)' : '');
    setShowPaymentModal(true);
  };

  // Abrir Modal de Facturación (Cobrar y Facturar o Emitir Factura de Saldado)
  const openInvoiceMonthModal = (acc: {
    customerRuc: string;
    customerName: string;
    currentBalance?: number;
    totalDelivered?: number;
    customerAddress?: string | null;
  }) => {
    if (isCashShiftOpen === false) {
      customAlert({
        title: 'Caja del Día Cerrada',
        message: 'Debe abrir el turno de caja en "Control de Cajas" antes de facturar o saldar cuentas corrientes.',
        variant: 'warning',
      });
      return;
    }
    const balance = acc.currentBalance && acc.currentBalance > 0 ? acc.currentBalance : 0;
    const defaultAmt = balance > 0 ? balance : acc.totalDelivered || 0;
    setInvoiceCustomer({
      ruc: acc.customerRuc,
      name: acc.customerName,
      address: acc.customerAddress || undefined,
      currentBalance: balance,
    });
    setInvoiceAmount(defaultAmt > 0 ? String(defaultAmt) : '');
    setSettleBalanceOnInvoice(balance > 0);
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
        const remainingAfter = (paymentCustomer.currentBalance || 0) - Number(paymentAmount);
        setShowPaymentModal(false);
        customAlert({
          title: remainingAfter <= 0 ? 'Cuenta Saldada (Sin Factura)' : 'Abono Registrado con Éxito',
          message:
            remainingAfter <= 0
              ? `Se registró el pago total de ${formatCurrencyPYG(Number(paymentAmount))} para ${paymentCustomer.name}. La cuenta quedó en ₲ 0 y salió de la lista de libretas pendientes.`
              : `Se registró el abono de ${formatCurrencyPYG(Number(paymentAmount))} para ${paymentCustomer.name}. Ingresó a la caja activa del día.`,
          variant: 'success',
        });
        await fetchAccounts();
        if (remainingAfter <= 0 && accountFilter === 'pending') {
          setSelectedRuc(null);
          setSelectedDetail(null);
        } else if (selectedRuc) {
          fetchDetail(selectedRuc);
        }
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

  // Enviar Facturación (con o sin cancelación simultánea de saldo)
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
          settleAccountBalance: settleBalanceOnInvoice,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const remainingAfter = settleBalanceOnInvoice
          ? (invoiceCustomer.currentBalance || 0) - Number(invoiceAmount)
          : invoiceCustomer.currentBalance || 0;
        setShowInvoiceMonthModal(false);
        customAlert({
          title: 'Factura SIFEN Emitida con Éxito',
          message:
            settleBalanceOnInvoice && remainingAfter <= 0
              ? `Se cobró y facturó ${formatCurrencyPYG(Number(invoiceAmount))} para ${invoiceCustomer.name}. La libreta quedó saldada en ₲ 0 y salió de pendientes.`
              : `Se emitió la factura electrónica por ${formatCurrencyPYG(Number(invoiceAmount))}.`,
          variant: 'success',
        });
        await fetchAccounts();
        if (remainingAfter <= 0 && accountFilter === 'pending') {
          setSelectedRuc(null);
          setSelectedDetail(null);
        } else if (selectedRuc) {
          fetchDetail(selectedRuc);
        }
        // Abrir el visor de la factura emitida para imprimir o descargar PDF
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

  // Separar pendientes de saldados (una vez pagado todo, sale de la lista de libretas pendientes)
  const pendingAccountsCount = accounts.filter((a) => a.currentBalance > 0).length;
  const settledAccountsCount = accounts.filter((a) => a.currentBalance <= 0).length;

  const filteredAccounts = accounts.filter((a) => {
    if (accountFilter === 'cancelled') return false;
    const matchesStatus = accountFilter === 'pending' ? a.currentBalance > 0 : a.currentBalance <= 0;
    const matchesSearch =
      a.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.customerRuc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredCancelledOrders = cancelledOrders.filter((co) => {
    const q = searchQuery.toLowerCase();
    return (
      co.customerName.toLowerCase().includes(q) ||
      co.customerRuc.toLowerCase().includes(q) ||
      co.saleNumber.toLowerCase().includes(q) ||
      co.deliveryNotes.toLowerCase().includes(q)
    );
  });

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

      {/* Barra de Búsqueda y Filtro Pendientes / Saldados */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-lg border border-card-border">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center p-1 rounded-lg bg-[#0d121c] border border-card-border text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setAccountFilter('pending');
                setSelectedRuc(null);
              }}
              className={`px-3 py-1 rounded transition-colors ${
                accountFilter === 'pending'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Libretas Pendientes ({pendingAccountsCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setAccountFilter('settled');
                setSelectedRuc(null);
              }}
              className={`px-3 py-1 rounded transition-colors ${
                accountFilter === 'settled'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Saldados / Historial ({settledAccountsCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setAccountFilter('cancelled');
                setSelectedRuc(null);
              }}
              className={`px-3 py-1 rounded transition-colors ${
                accountFilter === 'cancelled'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Anulados ({cancelledOrders.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente o RUC..."
              className="w-full bg-[#0d121c] border border-card-border rounded-md pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono"
            />
          </div>
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
      {accountFilter === 'cancelled' ? (
        <div className="space-y-3">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground font-mono">
              Cargando historial de pedidos anulados...
            </div>
          ) : filteredCancelledOrders.length === 0 ? (
            <div className="p-8 text-center bg-card border border-card-border rounded-lg text-xs text-muted-foreground font-mono">
              No hay pedidos de libreta anulados registrados. Cuando un pedido se anula, el stock regresa al depósito y el registro queda auditado aquí.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredCancelledOrders.map((co) => (
                <div
                  key={co.id}
                  className="p-4 rounded-lg bg-card border border-red-500/30 space-y-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-red-400">
                          {co.saleNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-[10px] font-mono font-bold text-red-300 flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" />
                          ANULADO &bull; STOCK DEVUELTO
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-foreground mt-1">
                        {co.customerName}{' '}
                        <span className="font-mono font-normal text-muted-foreground">
                          (RUC: {co.customerRuc})
                        </span>
                      </h4>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-xs font-bold text-red-300 line-through block">
                        {formatCurrencyPYG(co.grandTotal)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Pedido: {new Date(co.createdAt).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' })} &bull; Anulado:{' '}
                        {new Date(co.cancelledAt).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' })}{' '}
                        {new Date(co.cancelledAt).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {co.deliveryNotes && (
                    <div className="p-2.5 rounded bg-red-950/25 border border-red-500/20 text-[11px] font-mono text-red-200 whitespace-pre-wrap">
                      {co.deliveryNotes}
                    </div>
                  )}

                  {co.items && co.items.length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-1.5">
                      {co.items.map((it, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-[#0d121c] border border-card-border text-[10px] font-mono text-muted-foreground"
                        >
                          +{it.quantity} {it.unitOfMeasure} &bull; {it.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Lista de Clientes con Cuenta Corriente (Izquierda) */}
        <div className={`${selectedRuc ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-2`}>
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground font-mono">
              Cargando cuentas corrientes...
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="p-8 text-center bg-card border border-card-border rounded-lg text-xs text-muted-foreground font-mono">
              {accountFilter === 'pending'
                ? 'No hay clientes con saldo pendiente en libreta. Toda venta cargada en "A Cuenta / Libreta" aparecerá aquí hasta que se pague por completo.'
                : 'No hay cuentas saldadas para mostrar todavía.'}
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
                  <div className="flex flex-wrap items-center justify-end gap-1.5 mt-2.5 pt-2 border-t border-card-border/40">
                    {acc.currentBalance > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPaymentModal(acc, 'full_no_invoice');
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors"
                          title="Cobrar el saldo total pendiente sin emitir factura y sacar de la lista"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Pago Total (Sin Factura)</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPaymentModal(acc, 'partial');
                          }}
                          className="px-2 py-1 rounded bg-[#0d121c] hover:bg-muted/30 text-muted-foreground hover:text-foreground border border-card-border text-[10px] font-mono flex items-center gap-1 transition-colors"
                          title="Registrar abono o entrega parcial"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Abono</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openInvoiceMonthModal(acc);
                      }}
                      className="px-2.5 py-1 rounded bg-primary/20 hover:bg-primary/35 text-primary border border-primary/40 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors"
                      title={
                        acc.currentBalance > 0
                          ? 'Cobrar el saldo y emitir Factura Electrónica SIFEN en un solo clic'
                          : 'Emitir Factura Electrónica SIFEN por compras ya abonadas'
                      }
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>{acc.currentBalance > 0 ? 'Cobrar y Facturar' : 'Emitir Factura'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detalle del Estado de Cuenta / Extracto (Derecha) */}
        {selectedRuc && (
          <div
            id="printable-account-statement"
            className="lg:col-span-7 bg-card border border-card-border rounded-lg p-4 space-y-4"
          >
            {loadingDetail ? (
              <div className="p-8 text-center text-xs text-muted-foreground font-mono">
                Cargando extracto del cliente...
              </div>
            ) : selectedDetail ? (
              <>
                {/* Cabecera del Cliente */}
                <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-card-border">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {selectedDetail.customer?.name}
                    </h3>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {(() => {
                        const distinctProjects = Array.from(
                          new Set((selectedDetail.orders || []).map((o: any) => getOrderProjectLabel(o)))
                        );
                        const obraSummary =
                          distinctProjects.length > 1
                            ? `${distinctProjects.length} obras / destinos registrados`
                            : distinctProjects.length === 1
                            ? String(distinctProjects[0])
                            : selectedDetail.customer?.address || 'Planta / Mostrador';
                        return `RUC: ${selectedDetail.customer?.ruc} • ${obraSummary}`;
                      })()}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 no-print">
                    <button
                      type="button"
                      disabled={exportingAccountPdf}
                      onClick={() => handleDownloadStatementPdf(false)}
                      className="px-2.5 py-1.5 rounded-md bg-[#0d121c] border border-sky-500/40 text-sky-300 hover:bg-[#172133] text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                      title="Descargar extracto de cuenta en PDF"
                    >
                      {exportingAccountPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                      <span>PDF</span>
                    </button>

                    <button
                      type="button"
                      disabled={exportingAccountPdf}
                      onClick={() => handleDownloadStatementPdf(true)}
                      className="px-2.5 py-1.5 rounded-md bg-emerald-700/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-700/35 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                      title="Descargar PDF y abrir WhatsApp para enviar extracto"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    {selectedDetail.currentBalance > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            openPaymentModal(
                              {
                                customerRuc: selectedDetail.customer.ruc,
                                customerName: selectedDetail.customer.name,
                                currentBalance: selectedDetail.currentBalance,
                              },
                              'full_no_invoice'
                            )
                          }
                          className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Pago Total (Sin Factura)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openPaymentModal(
                              {
                                customerRuc: selectedDetail.customer.ruc,
                                customerName: selectedDetail.customer.name,
                                currentBalance: selectedDetail.currentBalance,
                              },
                              'partial'
                            )
                          }
                          className="px-2.5 py-1.5 rounded-md bg-[#0d121c] border border-card-border hover:border-emerald-500 text-foreground text-xs font-semibold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Abono</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        openInvoiceMonthModal({
                          customerRuc: selectedDetail.customer.ruc,
                          customerName: selectedDetail.customer.name,
                          currentBalance: selectedDetail.currentBalance,
                          totalDelivered: selectedDetail.totalDelivered,
                          customerAddress: selectedDetail.customer.address,
                        })
                      }
                      className="px-3 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 shadow-md"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{selectedDetail.currentBalance > 0 ? 'Cobrar y Facturar' : 'Emitir Factura'}</span>
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
                              <span className="text-[10px] text-sky-300/90 block font-sans">
                                Obra: {getOrderProjectLabel(ord)}
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
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onViewInvoice(ord)}
                                  className="text-[10px] text-primary hover:underline"
                                >
                                  Ver Orden
                                </button>
                                {!ord.invoice && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOrderToCancel(ord);
                                      setCancelReason('');
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-red-500/15 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                                    title="Anular pedido de libreta y devolver productos al stock"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Anular</span>
                                  </button>
                                )}
                              </div>
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
      )}

      {/* ================= MODAL 1: REGISTRAR PAGO A CUENTA (COBRO DE VIERNES) ================= */}
      {showPaymentModal && paymentCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-card border border-card-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-card-border bg-[#0b0e14] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-foreground">
                  {paymentMode === 'full_no_invoice'
                    ? 'Pago Total por Monto (Sin Factura)'
                    : 'Registrar Abono / Entrega Parcial'}
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
              <div className="p-2.5 rounded-lg bg-[#0d121c] border border-card-border font-mono text-[11px] flex items-center justify-between gap-2">
                <div>
                  <div className="text-muted-foreground">Cliente: <strong className="text-foreground">{paymentCustomer.name}</strong></div>
                  <div className="text-muted-foreground text-[10px]">RUC: {paymentCustomer.ruc}</div>
                </div>
                {(paymentCustomer.currentBalance || 0) > 0 && (
                  <div className="text-right">
                    <span className="text-[9px] text-muted-foreground block">Saldo Total</span>
                    <strong className="text-amber-400">{formatCurrencyPYG(paymentCustomer.currentBalance || 0)}</strong>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono text-muted-foreground">
                    Monto a Cobrar (Gs.) *
                  </label>
                  {(paymentCustomer.currentBalance || 0) > 0 && Number(paymentAmount) !== paymentCustomer.currentBalance && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(String(paymentCustomer.currentBalance))}
                      className="text-[10px] font-mono text-emerald-400 hover:underline font-bold"
                    >
                      Cargar Total ({formatCurrencyPYG(paymentCustomer.currentBalance || 0)})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  onFocus={(e) => e.target.select()}
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
                  min="1"
                  step="1"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="Ej: 600000"
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-2 text-foreground font-mono text-sm font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#0d121c] border border-card-border cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settleBalanceOnInvoice}
                  onChange={(e) => setSettleBalanceOnInvoice(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-card-border accent-emerald-500 cursor-pointer"
                />
                <div className="text-[11px] leading-snug">
                  <span className="font-bold text-foreground block">
                    Saldar libreta e ingresar el cobro a Caja al emitir factura
                  </span>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    {settleBalanceOnInvoice
                      ? 'Cobra el monto, deja la libreta en ₲ 0 y saca al cliente de pendientes.'
                      : 'Solo emite la Factura SIFEN (útil si el cliente ya había pagado previamente).'}
                  </span>
                </div>
              </label>

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

      {/* Modal: Confirmar Anulación de Pedido de Libreta y Devolución de Stock */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-red-500/40 rounded-lg shadow-2xl overflow-hidden text-xs">
            <div className="px-5 py-3.5 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-semibold text-foreground">
                  Anular Pedido de Libreta
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCancelOrder} className="p-5 space-y-3.5">
              <div className="p-3 rounded bg-[#0d121c] border border-card-border space-y-1 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Orden N°:</span>
                  <span className="font-bold text-foreground">{orderToCancel.saleNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Monto descontado de libreta:</span>
                  <span className="font-bold text-amber-400">
                    {formatCurrencyPYG(Number(orderToCancel.grandTotal))}
                  </span>
                </div>
              </div>

              {orderToCancel.items && orderToCancel.items.length > 0 && (
                <div className="p-3 rounded bg-emerald-500/5 border border-emerald-500/25 space-y-1.5">
                  <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" />
                    Productos que volverán al stock automáticamente:
                  </span>
                  <ul className="space-y-0.5 text-[11px] font-mono text-muted-foreground max-h-28 overflow-y-auto">
                    {orderToCancel.items.map((it: any, i: number) => (
                      <li key={i}>
                        + {Number(it.quantity)} {it.product?.unitOfMeasure || ''} &bull;{' '}
                        {it.product?.name || 'Producto'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono font-semibold text-foreground mb-1">
                  Motivo de anulación / cambio *
                </label>
                <textarea
                  required
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ej: El cliente canceló antes de salir el camión / cambio de materiales"
                  className="w-full bg-[#0d121c] border border-card-border rounded-md p-2.5 text-foreground font-mono text-[11px] focus:outline-none focus:border-red-400"
                />
              </div>

              <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/25 text-[10px] font-mono text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Esta anulación queda registrada con tu nombre de usuario, fecha, hora y motivo en la pestaña Anulados, en Historial de Ventas y en el Kardex de Inventario.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setOrderToCancel(null)}
                  className="px-3 py-1.5 rounded-md border border-card-border text-muted-foreground hover:bg-muted/20"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={cancellingOrder}
                  className="px-4 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1.5 shadow-md"
                >
                  {cancellingOrder ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>{cancellingOrder ? 'Anulando...' : 'Confirmar Anulación y Devolver Stock'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plantilla A4 fuera de pantalla para generar el Extracto Preliminar PDF por Obra y Fecha */}
      {selectedDetail && (
        <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
          <AccountStatementA4 detail={selectedDetail} />
        </div>
      )}
    </div>
  );
}


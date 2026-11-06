'use client';

import React, { useState, useEffect } from 'react';
import {
  Landmark,
  Lock,
  Unlock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Minus,
  ShieldCheck,
  History,
  FileText,
  X,
  Archive,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  UserCheck,
} from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function CashShiftPanel() {
  const [shiftData, setShiftData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Estados de Apertura
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');

  // Estados de Cierre
  const [closingBalance, setClosingBalance] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Modales de Movimientos
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSafeDepositModal, setShowSafeDepositModal] = useState(false);

  // Formulario de Movimiento
  const [movementAmount, setMovementAmount] = useState('');
  const [movementDescription, setMovementDescription] = useState('');
  const [movementCategory, setMovementCategory] = useState('');
  const [movementBeneficiary, setMovementBeneficiary] = useState('');
  const [envelopeCode, setEnvelopeCode] = useState('');
  const [receiptNo, setReceiptNo] = useState('');
  const [savingMovement, setSavingMovement] = useState(false);

  // Vista de Historial
  const [showHistoryView, setShowHistoryView] = useState(false);

  const fetchShift = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/billing/shifts');
      const json = await res.json();
      if (json.success) {
        setShiftData(json.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShift();
  }, []);

  const currentShift = shiftData?.currentShift;
  const lastClosed = shiftData?.lastClosedShift;
  const metrics = shiftData?.metrics;
  const history = shiftData?.history || [];

  // Comprobación a ciegas al abrir
  const expectedPreviousClose = lastClosed ? Number(lastClosed.closingBalance) : null;
  const typedOpening = Number(openingBalance) || 0;
  const openingDiff = expectedPreviousClose !== null ? typedOpening - expectedPreviousClose : 0;
  const hasOpeningMismatch = expectedPreviousClose !== null && openingBalance !== '' && openingDiff !== 0;

  // Apertura de caja
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (openingBalance === '') {
      alert('Debe ingresar el monto de efectivo que encuentra físicamente en caja');
      return;
    }
    if (hasOpeningMismatch && !openingNotes.trim()) {
      alert('Hay una diferencia respecto al cierre anterior. Debe ingresar una nota explicando el motivo.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/billing/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'OPEN',
          openingBalance: typedOpening,
          openingNotes: openingNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOpeningBalance('');
        setOpeningNotes('');
        fetchShift();
      } else {
        alert(data.error?.message || 'Error al abrir caja');
      }
    } finally {
      setLoading(false);
    }
  };

  // Cierre inmutable de caja
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift) return;
    if (closingBalance === '') {
      alert('Debe ingresar el monto físico en efectivo que quedó en el cajón');
      return;
    }
    if (!confirm('¿Confirma el arqueo y cierre definitivo de la caja? Una vez cerrada, los datos quedan congelados e inmutables.')) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/billing/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLOSE',
          shiftId: currentShift.id,
          closingBalance: Number(closingBalance) || 0,
          notes: closingNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setClosingBalance('');
        setClosingNotes('');
        fetchShift();
      } else {
        alert(data.error?.message || 'Error al cerrar caja');
      }
    } finally {
      setLoading(false);
    }
  };

  // Guardar Movimiento (Sencillo, Gasto o Extracción a Sobre)
  const handleCreateMovement = async (type: string) => {
    if (!movementAmount || Number(movementAmount) <= 0 || !movementDescription.trim()) {
      alert('Monto mayor a cero y motivo/justificación son obligatorios');
      return;
    }
    setSavingMovement(true);
    try {
      const res = await fetch('/api/v1/billing/shifts/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: currentShift.id,
          type,
          category: movementCategory || (type === 'SAFE_DEPOSIT' ? 'EXTRACCION_SOBRE' : type === 'INCOME_CHANGE' ? 'SENCILLO' : 'GASTO_OPERATIVO'),
          amount: Number(movementAmount),
          description: movementDescription.trim(),
          beneficiary: movementBeneficiary.trim() || undefined,
          envelopeCode: envelopeCode.trim() || undefined,
          receiptNo: receiptNo.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowIncomeModal(false);
        setShowExpenseModal(false);
        setShowSafeDepositModal(false);
        setMovementAmount('');
        setMovementDescription('');
        setMovementCategory('');
        setMovementBeneficiary('');
        setEnvelopeCode('');
        setReceiptNo('');
        fetchShift();
      } else {
        alert(data.error?.message || 'Error al registrar movimiento');
      }
    } finally {
      setSavingMovement(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Barra de Título y Conmutador de Vistas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-card-border p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-2.5">
          <Landmark className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-base font-bold text-foreground font-sans">
              Control de Turnos de Caja, Tesorería & Arqueos
            </h2>
            <p className="text-[11px] text-muted-foreground font-mono">
              Terminal: {shiftData?.register?.name || 'Caja Mostrador Central'} ({shiftData?.register?.code || 'CAJA-01'})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHistoryView(!showHistoryView)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
              showHistoryView
                ? 'bg-primary text-white border-primary'
                : 'bg-[#0d121c] border-card-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{showHistoryView ? 'Volver al Turno Actual' : 'Historial de Cierres'}</span>
          </button>
          <span
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border ${
              currentShift
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-danger/10 text-danger border-danger/20'
            }`}
          >
            {currentShift ? 'Turno Abierto (Operativo)' : 'Caja Cerrada (Inactiva)'}
          </span>
        </div>
      </div>

      {showHistoryView ? (
        /* VISTA DE HISTORIAL DE CIERRES INMUTABLES */
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-card-border pb-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
              <Archive className="w-4 h-4 text-primary" /> Registro Histórico de Cierres de Caja Inmutables
            </h3>
            <span className="text-[11px] font-mono text-muted-foreground">{history.length} turnos archivados</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0d121c] border-b border-card-border text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3">Apertura</th>
                  <th className="py-2.5 px-3">Cierre</th>
                  <th className="py-2.5 px-3 text-right">Fondo Inicial</th>
                  <th className="py-2.5 px-3 text-right">Ventas Efectivo</th>
                  <th className="py-2.5 px-3 text-right">Gastos / Adelantos</th>
                  <th className="py-2.5 px-3 text-right">En Sobres Fuerte</th>
                  <th className="py-2.5 px-3 text-right">Efectivo Cajón</th>
                  <th className="py-2.5 px-3 text-center">Diferencia</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border text-muted-foreground">
                {history.map((s: any) => {
                  const diff = Number(s.difference || 0);
                  return (
                    <tr key={s.id} className="hover:bg-muted/10">
                      <td className="py-2.5 px-3 text-[11px] text-foreground">
                        {format(new Date(s.openedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </td>
                      <td className="py-2.5 px-3 text-[11px]">
                        {s.closedAt ? format(new Date(s.closedAt), 'dd/MM/yyyy HH:mm', { locale: es }) : 'En curso'}
                      </td>
                      <td className="py-2.5 px-3 text-right">{formatCurrencyPYG(Number(s.openingBalance))}</td>
                      <td className="py-2.5 px-3 text-right text-foreground font-bold">{formatCurrencyPYG(Number(s.totalCashSales || 0))}</td>
                      <td className="py-2.5 px-3 text-right text-danger">{formatCurrencyPYG(Number(s.totalExpenses || 0))}</td>
                      <td className="py-2.5 px-3 text-right text-accent font-bold">{formatCurrencyPYG(Number(s.totalSafeDeposits || 0))}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">{formatCurrencyPYG(Number(s.closingBalance || 0))}</td>
                      <td className="py-2.5 px-3 text-center">
                        {s.isOpen ? (
                          <span className="text-[10px] text-muted-foreground">-</span>
                        ) : diff === 0 ? (
                          <span className="text-[10px] text-emerald-400 font-bold">Cuadrado</span>
                        ) : diff > 0 ? (
                          <span className="text-[10px] text-accent font-bold">+{formatCurrencyPYG(diff)}</span>
                        ) : (
                          <span className="text-[10px] text-danger font-bold">{formatCurrencyPYG(diff)}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {s.isOpen ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">Abierto</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-card border border-card-border text-muted-foreground font-bold">Cerrado</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : currentShift ? (
        /* VISTA: TURNO DE CAJA ACTIVO */
        <div className="space-y-5">
          {/* Tarjetas Métricas en Vivo */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl bg-card border border-card-border">
              <span className="text-[10px] font-mono uppercase text-muted-foreground block">Fondo Apertura</span>
              <p className="text-sm font-bold font-mono text-foreground mt-1">
                {formatCurrencyPYG(metrics?.openingBalance || 0)}
              </p>
              {currentShift.openingDifference && Number(currentShift.openingDifference) !== 0 && (
                <span className="text-[9px] font-mono text-warning block mt-0.5">
                  Dif. inicial: {formatCurrencyPYG(Number(currentShift.openingDifference))}
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-card border border-card-border">
              <span className="text-[10px] font-mono uppercase text-emerald-400 block flex items-center gap-1">
                <ArrowDownRight className="w-3 h-3 text-emerald-400" /> Cobrado Efectivo
              </span>
              <p className="text-sm font-bold font-mono text-emerald-400 mt-1">
                +{formatCurrencyPYG(metrics?.cashSales || 0)}
              </p>
              <span className="text-[9px] font-mono text-muted-foreground block">
                {currentShift.sales?.length || 0} tickets
              </span>
            </div>

            <div className="p-3 rounded-xl bg-card border border-card-border">
              <span className="text-[10px] font-mono uppercase text-primary block flex items-center gap-1">
                <Plus className="w-3 h-3 text-primary" /> Sencillo Ingresado
              </span>
              <p className="text-sm font-bold font-mono text-primary mt-1">
                +{formatCurrencyPYG(metrics?.incomes || 0)}
              </p>
              <span className="text-[9px] font-mono text-muted-foreground block">Para dar cambio</span>
            </div>

            <div className="p-3 rounded-xl bg-card border border-card-border">
              <span className="text-[10px] font-mono uppercase text-danger block flex items-center gap-1">
                <Minus className="w-3 h-3 text-danger" /> Gastos / Adelantos
              </span>
              <p className="text-sm font-bold font-mono text-danger mt-1">
                -{formatCurrencyPYG(metrics?.expenses || 0)}
              </p>
              <span className="text-[9px] font-mono text-muted-foreground block">Salidas de caja</span>
            </div>

            <div className="p-3 rounded-xl bg-card border border-card-border">
              <span className="text-[10px] font-mono uppercase text-accent block flex items-center gap-1">
                <Archive className="w-3 h-3 text-accent" /> Retirado a Sobre
              </span>
              <p className="text-sm font-bold font-mono text-accent mt-1">
                -{formatCurrencyPYG(metrics?.safeDeposits || 0)}
              </p>
              <span className="text-[9px] font-mono text-muted-foreground block">En caja fuerte</span>
            </div>

            <div className="p-3 rounded-xl bg-[#0d121c] border-2 border-primary/40 shadow-inner">
              <span className="text-[10px] font-mono uppercase text-primary font-bold block">Efectivo en Cajón</span>
              <p className="text-base font-bold font-mono text-emerald-400 mt-1">
                {formatCurrencyPYG(metrics?.expectedCashInDrawer || 0)}
              </p>
              <span className="text-[9px] font-mono text-muted-foreground block">Debe haber ahora</span>
            </div>
          </div>

          {/* Barra de Acciones Rápidas de Movimientos */}
          <div className="flex flex-wrap items-center gap-2.5 bg-card border border-card-border p-3 rounded-xl">
            <span className="text-xs font-mono text-muted-foreground font-semibold uppercase mr-2">
              Movimientos del Turno:
            </span>

            <button
              type="button"
              onClick={() => {
                setMovementCategory('SENCILLO');
                setMovementDescription('Carga de sencillo para dar vuelto');
                setShowIncomeModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 text-xs font-mono font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Ingreso de Sencillo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMovementCategory('ADELANTO_PERSONAL');
                setMovementDescription('');
                setShowExpenseModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20 text-xs font-mono font-semibold transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>- Salida / Gasto (Adelanto, Agua, etc.)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMovementCategory('EXTRACCION_SOBRE');
                setMovementDescription('Extracción de billetes de 100k y 50k a sobre de seguridad');
                setShowSafeDepositModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 text-xs font-mono font-semibold transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>🔒 Extraer Billetes Grandes a Sobre</span>
            </button>
          </div>

          {/* Dos Columnas: Tabla de Movimientos y Panel de Cierre */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Columna Izquierda: Registro de Movimientos */}
            <div className="lg:col-span-8 bg-card border border-card-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-card-border pb-2">
                <span className="text-xs font-mono uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" /> Asientos de Caja Menor & Extracciones
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {currentShift.movements?.length || 0} movimientos
                </span>
              </div>

              {(!currentShift.movements || currentShift.movements.length === 0) ? (
                <p className="text-xs text-muted-foreground text-center py-10 font-sans">
                  No hay movimientos de caja menor registrados en este turno.
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {currentShift.movements.map((m: any) => {
                    const isIncome = m.type === 'INCOME_CHANGE';
                    const isSafe = m.type === 'SAFE_DEPOSIT';
                    return (
                      <div
                        key={m.id}
                        className="p-2.5 rounded bg-[#0d121c] border border-card-border flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`p-1.5 rounded ${
                              isIncome
                                ? 'bg-primary/20 text-primary'
                                : isSafe
                                ? 'bg-accent/20 text-accent'
                                : 'bg-danger/20 text-danger'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            ) : isSafe ? (
                              <Archive className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{m.description}</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                              <span>{format(new Date(m.createdAt), 'HH:mm')}</span>
                              {m.beneficiary && <span>&bull; Beneficiario: {m.beneficiary}</span>}
                              {m.envelopeCode && <span>&bull; Sobre: {m.envelopeCode}</span>}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`font-mono font-bold text-xs ${
                            isIncome ? 'text-primary' : isSafe ? 'text-accent' : 'text-danger'
                          }`}
                        >
                          {isIncome ? '+' : '-'}
                          {formatCurrencyPYG(Number(m.amount))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Columna Derecha: Formulario de Arqueo y Cierre Definitivo */}
            <div className="lg:col-span-4 bg-card border border-card-border rounded-xl p-4 flex flex-col justify-between space-y-4">
              <form onSubmit={handleCloseShift} className="space-y-3 font-sans text-xs flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="border-b border-card-border pb-2">
                    <span className="text-xs font-mono uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-danger" /> Arqueo Final & Cierre Inmutable
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Una vez confirmada, esta caja quedará congelada y será el saldo inicial del día siguiente.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0d121c] border border-card-border font-mono space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Efectivo esperado en cajón:</span>
                      <span className="text-foreground font-bold">
                        {formatCurrencyPYG(metrics?.expectedCashInDrawer || 0)}
                      </span>
                    </div>
                    {metrics?.safeDeposits > 0 && (
                      <div className="flex justify-between text-accent text-[11px]">
                        <span>Resguardado en sobres:</span>
                        <span>{formatCurrencyPYG(metrics?.safeDeposits || 0)}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-mono text-muted-foreground">
                        Conteo Físico Real en Cajón (₲) *
                      </label>
                      {metrics?.expectedCashInDrawer !== undefined && (
                        <button
                          type="button"
                          onClick={() => setClosingBalance(String(metrics.expectedCashInDrawer))}
                          className="text-[10px] font-mono text-primary hover:underline"
                        >
                          Usar Esperado ({formatCurrencyPYG(metrics.expectedCashInDrawer)})
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      required
                      min="0"
                      value={closingBalance}
                      onChange={(e) => setClosingBalance(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      placeholder="Ingrese el monto exacto contado..."
                      className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground text-sm font-bold focus:outline-none focus:border-danger"
                    />
                  </div>

                  {closingBalance !== '' && (
                    <div className="p-2.5 rounded bg-[#0d121c] border border-card-border font-mono text-xs">
                      {Number(closingBalance) - (metrics?.expectedCashInDrawer || 0) === 0 ? (
                        <div className="text-emerald-400 flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Caja Cuadrada Perfecta
                        </div>
                      ) : Number(closingBalance) - (metrics?.expectedCashInDrawer || 0) > 0 ? (
                        <div className="text-accent flex items-center gap-1 font-bold">
                          <span>Sobrante en caja: +{formatCurrencyPYG(Number(closingBalance) - (metrics?.expectedCashInDrawer || 0))}</span>
                        </div>
                      ) : (
                        <div className="text-danger flex items-center gap-1 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Faltante en caja: {formatCurrencyPYG(Number(closingBalance) - (metrics?.expectedCashInDrawer || 0))}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                      Observaciones de Cierre (Opcional)
                    </label>
                    <input
                      type="text"
                      value={closingNotes}
                      onChange={(e) => setClosingNotes(e.target.value)}
                      placeholder="Ej: Faltante de 2.000gs por redondeo de vueltos"
                      className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1 text-foreground text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-danger hover:bg-danger/80 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Cerrar Turno & Congelar Datos</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* VISTA: CAJA CERRADA -> FORMULARIO DE APERTURA CON COMPROBACIÓN A CIEGAS */
        <div className="bg-card border border-card-border rounded-xl p-6 max-w-xl mx-auto space-y-4 shadow-xl">
          <div className="border-b border-card-border pb-3 flex items-center gap-2.5">
            <Unlock className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-foreground font-sans">
                Apertura Diaria de Caja con Comprobación a Ciegas
              </h3>
              <p className="text-[11px] text-muted-foreground font-mono">
                Cuente físicamente el dinero que encuentra en el cajón para iniciar el día.
              </p>
            </div>
          </div>

          <form onSubmit={handleOpenShift} className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-mono text-muted-foreground">
                  Efectivo Físico Encontrado en el Cajón (₲) *
                </label>
                {expectedPreviousClose !== null && (
                  <button
                    type="button"
                    onClick={() => setOpeningBalance(String(expectedPreviousClose))}
                    className="text-[10px] font-mono text-primary hover:underline"
                  >
                    Usar Cierre Anterior ({formatCurrencyPYG(expectedPreviousClose)})
                  </button>
                )}
              </div>
              <input
                type="number"
                required
                min="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                onFocus={(e) => e.target.select()}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                placeholder="Ej: 500000"
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-2 font-mono text-foreground text-base font-bold focus:outline-none focus:border-primary"
              />
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] font-mono text-muted-foreground">Comunes:</span>
                {[300000, 500000, 1000000, 2000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setOpeningBalance(String(amt))}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0d121c] hover:bg-card border border-card-border hover:border-primary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {formatCurrencyPYG(amt)}
                  </button>
                ))}
              </div>
            </div>

            {/* Comprobación de Arqueo contra el Cierre Anterior */}
            {openingBalance !== '' && expectedPreviousClose !== null && (
              <div className="p-3 rounded-lg bg-[#0d121c] border border-card-border font-mono space-y-1">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Saldo del cierre anterior:</span>
                  <span>{formatCurrencyPYG(expectedPreviousClose)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Monto ingresado por cajero:</span>
                  <span className="font-bold text-foreground">{formatCurrencyPYG(typedOpening)}</span>
                </div>

                {openingDiff === 0 ? (
                  <div className="pt-2 border-t border-card-border text-emerald-400 font-bold flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Caja Cuadrada: Coincide exactamente con el cierre anterior.</span>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-card-border space-y-2">
                    <div className="text-warning font-bold flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                      <span>
                        Discrepancia detectada: {openingDiff > 0 ? '+' : ''}{formatCurrencyPYG(openingDiff)} (
                        {openingDiff > 0 ? 'Sobrante' : 'Faltante'})
                      </span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-warning mb-1">
                        Justificación obligatoria de la diferencia para auditoría:
                      </label>
                      <input
                        type="text"
                        required
                        value={openingNotes}
                        onChange={(e) => setOpeningNotes(e.target.value)}
                        placeholder="Ej: Faltante de 50.000gs verificado con Fátima por entrega de cambio anoche"
                        className="w-full bg-card border border-warning/50 rounded-md px-2.5 py-1 text-foreground text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || openingBalance === ''}
              className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <Unlock className="w-4 h-4" />
              <span>Confirmar Conteo e Iniciar Turno del Día</span>
            </button>
          </form>
        </div>
      )}

      {/* MODAL 1: INGRESO DE SENCILLO */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-card-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden p-5 space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-card-border pb-2.5">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Ingreso de Sencillo / Cambio</h3>
              </div>
              <button type="button" onClick={() => setShowIncomeModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Monto de Sencillo (₲) *</label>
              <input
                type="number"
                required
                min="1"
                placeholder="Ej: 200000"
                value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)}
                onFocus={(e) => e.target.select()}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground text-sm font-bold focus:outline-none focus:border-primary"
              />
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] font-mono text-muted-foreground">Rápido:</span>
                {[50000, 100000, 200000, 500000, 1000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setMovementAmount(String(amt))}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0d121c] hover:bg-card border border-card-border hover:border-primary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    +{formatCurrencyPYG(amt)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Motivo / Detalle *</label>
              <input
                type="text"
                required
                value={movementDescription}
                onChange={(e) => setMovementDescription(e.target.value)}
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-card-border">
              <button type="button" onClick={() => setShowIncomeModal(false)} className="px-3 py-1.5 rounded-md border border-card-border text-muted-foreground">
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingMovement}
                onClick={() => handleCreateMovement('INCOME_CHANGE')}
                className="px-4 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white font-semibold flex items-center gap-1.5"
              >
                <span>{savingMovement ? 'Guardando...' : 'Asentar Ingreso'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: GASTO OPERATIVO / ADELANTO */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-card-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden p-5 space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-card-border pb-2.5">
              <div className="flex items-center gap-2">
                <Minus className="w-4 h-4 text-danger" />
                <h3 className="text-sm font-bold text-foreground">Salida de Dinero / Gasto de Caja</h3>
              </div>
              <button type="button" onClick={() => setShowExpenseModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">Tipo de Salida *</label>
                <select
                  value={movementCategory}
                  onChange={(e) => setMovementCategory(e.target.value)}
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-2 py-1.5 text-foreground text-xs"
                >
                  <option value="ADELANTO_PERSONAL">Adelanto a Personal</option>
                  <option value="BIDONES_AGUA">Bidones de Agua / Insumos</option>
                  <option value="FLETE_MENOR">Flete Menor / Combustible</option>
                  <option value="OTROS">Otros Gastos Operativos</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">Monto (₲) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Ej: 100000"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground text-sm font-bold focus:outline-none focus:border-danger"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono text-muted-foreground">Comunes:</span>
              {[20000, 50000, 100000, 200000, 500000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setMovementAmount(String(amt))}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0d121c] hover:bg-card border border-card-border hover:border-danger text-muted-foreground hover:text-foreground transition-colors"
                >
                  {formatCurrencyPYG(amt)}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Persona que Recibe / Beneficiario *</label>
              <input
                type="text"
                required
                placeholder="Ej: Carlos Cabañas, Aguatería La Central..."
                value={movementBeneficiary}
                onChange={(e) => setMovementBeneficiary(e.target.value)}
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Motivo / Justificación *</label>
              <input
                type="text"
                required
                placeholder="Ej: Adelanto de sueldo semanal autorizado por gerencia"
                value={movementDescription}
                onChange={(e) => setMovementDescription(e.target.value)}
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-card-border">
              <button type="button" onClick={() => setShowExpenseModal(false)} className="px-3 py-1.5 rounded-md border border-card-border text-muted-foreground">
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingMovement}
                onClick={() =>
                  handleCreateMovement(
                    movementCategory === 'ADELANTO_PERSONAL' ? 'EXPENSE_ADVANCE' : 'EXPENSE_OPERATION'
                  )
                }
                className="px-4 py-1.5 rounded-md bg-danger hover:bg-danger/80 text-white font-semibold flex items-center gap-1.5"
              >
                <span>{savingMovement ? 'Guardando...' : 'Asentar Salida'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EXTRACCIÓN A SOBRE / CAJA FUERTE */}
      {showSafeDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-card-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden p-5 space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-card-border pb-2.5">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-bold text-foreground">Extracción de Billetes Grandes a Sobre</h3>
              </div>
              <button type="button" onClick={() => setShowSafeDepositModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 rounded bg-[#0d121c] border border-card-border text-muted-foreground text-[11px] leading-relaxed">
              Retiro de seguridad de billetes de 100.000 y 50.000 Gs. Este dinero se deduce del cajón del mostrador y se resguarda en el sobre de la caja fuerte.
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">Monto Retirado (₲) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Ej: 3000000"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground text-sm font-bold focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">N° de Sobre / Remesa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: SOBRE-01"
                  value={envelopeCode}
                  onChange={(e) => setEnvelopeCode(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground text-xs uppercase"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono text-muted-foreground">Rápido:</span>
              {[500000, 1000000, 2000000, 3000000, 5000000, 10000000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setMovementAmount(String(amt))}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0d121c] hover:bg-card border border-card-border hover:border-accent text-muted-foreground hover:text-accent transition-colors"
                >
                  {formatCurrencyPYG(amt)}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Entregado a / Receptor</label>
              <input
                type="text"
                placeholder="Ej: Fátima (Caja Fuerte Interna)"
                value={movementBeneficiary}
                onChange={(e) => setMovementBeneficiary(e.target.value)}
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-card-border">
              <button type="button" onClick={() => setShowSafeDepositModal(false)} className="px-3 py-1.5 rounded-md border border-card-border text-muted-foreground">
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingMovement}
                onClick={() => handleCreateMovement('SAFE_DEPOSIT')}
                className="px-4 py-1.5 rounded-md bg-accent hover:bg-accent/80 text-foreground font-semibold flex items-center gap-1.5"
              >
                <span>{savingMovement ? 'Guardando...' : 'Confirmar Extracción al Sobre'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

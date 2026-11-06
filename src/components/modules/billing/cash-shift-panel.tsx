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
  Eye,
  EyeOff,
  Calculator,
  Banknote,
  Coins,
  Clock,
} from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BanknoteCounter,
  INITIAL_DENOMINATIONS,
  CashDenominations,
  calculateBreakdownTotals,
  BILL_DENOMINATIONS,
  COIN_DENOMINATIONS,
} from './banknote-counter';
import { useCustomDialog } from '@/components/common/custom-dialog-provider';

export function CashShiftPanel() {
  const { alert: customAlert } = useCustomDialog();
  const [shiftData, setShiftData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Seguridad de Ceguera y PIN de Supervisor (1126)
  const SUPERVISOR_PIN = '1126';
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealSecondsLeft, setRevealSecondsLeft] = useState(0);

  // Estados de Apertura
  const [openingMethod, setOpeningMethod] = useState<'calculator' | 'direct'>('calculator');
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingBreakdown, setOpeningBreakdown] = useState<CashDenominations>(INITIAL_DENOMINATIONS);
  const [openingNotes, setOpeningNotes] = useState('');

  // Modal de Discrepancia al Abrir Caja
  const [mismatchOpeningData, setMismatchOpeningData] = useState<{
    declared: number;
    expected: number;
    diff: number;
    notes: string;
  } | null>(null);

  // Estados de Cierre
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingMethod, setClosingMethod] = useState<'calculator' | 'direct'>('calculator');
  const [closingBalance, setClosingBalance] = useState('');
  const [closingBreakdown, setClosingBreakdown] = useState<CashDenominations>(INITIAL_DENOMINATIONS);
  const [closingNotes, setClosingNotes] = useState('');

  // Modal de Confirmación Estilizado de Cierre
  const [pendingCloseAmount, setPendingCloseAmount] = useState<number | null>(null);

  // Modales Informativos y de Auditoría Post-Cierre
  const [showClosingSuccessModal, setShowClosingSuccessModal] = useState<any>(null);
  const [selectedShiftForBreakdown, setSelectedShiftForBreakdown] = useState<any>(null);

  // Modales de Movimientos de Caja Menor
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

  // Temporizador de auto-bloqueo a los 30 segundos si se revela con PIN
  useEffect(() => {
    if (!isRevealed || revealSecondsLeft <= 0) {
      if (isRevealed && revealSecondsLeft <= 0) {
        setIsRevealed(false);
      }
      return;
    }

    const timer = setInterval(() => {
      setRevealSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRevealed(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRevealed, revealSecondsLeft]);

  // Verificación del PIN de Supervisor (1126)
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin === SUPERVISOR_PIN) {
      setIsRevealed(true);
      setRevealSecondsLeft(30);
      setShowPinModal(false);
      setEnteredPin('');
      setPinError('');
    } else {
      setPinError('PIN incorrecto. Acceso denegado.');
      setEnteredPin('');
    }
  };

  const currentShift = shiftData?.currentShift;
  const metrics = shiftData?.metrics;
  const history = shiftData?.history || [];

  // Totales calculados de billetaje en vivo
  const openingBreakdownTotal = calculateBreakdownTotals(openingBreakdown).grandTotal;
  const closingBreakdownTotal = calculateBreakdownTotals(closingBreakdown).grandTotal;

  // Apertura de caja: Ejecución de apertura real
  const executeOpenShift = async (amount: number, notesStr: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/billing/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'OPEN',
          openingBalance: amount,
          openingNotes: notesStr.trim() || undefined,
          breakdown: openingMethod === 'calculator' ? openingBreakdown : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMismatchOpeningData(null);
        setOpeningBalance('');
        setOpeningNotes('');
        setOpeningBreakdown({ ...INITIAL_DENOMINATIONS });
        fetchShift();
      } else {
        await customAlert({
          title: 'Error de Apertura',
          message: data.error?.message || 'Error al abrir caja',
          variant: 'danger',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Apertura de caja: Verificación previa de ceguera y discrepancias
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = openingMethod === 'calculator'
      ? openingBreakdownTotal
      : Number(openingBalance) || 0;

    if (finalAmount <= 0 && openingMethod === 'direct' && openingBalance === '') {
      await customAlert({
        title: 'Monto Requerido',
        message: 'Debe ingresar el monto de efectivo que encuentra físicamente en el cajón para iniciar el turno.',
        variant: 'warning',
      });
      return;
    }

    const expectedPreviousClose = shiftData?.lastClosedShift ? Number(shiftData.lastClosedShift.closingBalance) : null;

    // Si hay un saldo anterior registrado y NO coincide exactamente con el conteo físico:
    if (expectedPreviousClose !== null && finalAmount !== expectedPreviousClose) {
      setMismatchOpeningData({
        declared: finalAmount,
        expected: expectedPreviousClose,
        diff: finalAmount - expectedPreviousClose,
        notes: openingNotes,
      });
      return;
    }

    // Si coincide perfectamente o es la primera apertura:
    await executeOpenShift(finalAmount, openingNotes);
  };

  // Cierre de caja: Solicitar confirmación con Modal Estilizado (sin window.confirm)
  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift) return;

    const finalAmount = closingMethod === 'calculator'
      ? closingBreakdownTotal
      : Number(closingBalance) || 0;

    if (finalAmount < 0) {
      customAlert({
        title: 'Monto Inválido',
        message: 'El monto físico en efectivo no puede ser negativo.',
        variant: 'warning',
      });
      return;
    }

    setPendingCloseAmount(finalAmount);
  };

  // Cierre de caja: Ejecución definitiva tras confirmación en modal
  const executeCloseShift = async () => {
    if (pendingCloseAmount === null || !currentShift) return;

    setLoading(true);
    try {
      const res = await fetch('/api/v1/billing/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLOSE',
          shiftId: currentShift.id,
          closingBalance: pendingCloseAmount,
          notes: closingNotes.trim() || undefined,
          breakdown: closingMethod === 'calculator' ? closingBreakdown : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPendingCloseAmount(null);
        setShowCloseModal(false);
        setClosingBalance('');
        setClosingNotes('');
        setClosingBreakdown({ ...INITIAL_DENOMINATIONS });
        setShowClosingSuccessModal(data.data);
        fetchShift();
      } else {
        await customAlert({
          title: 'Error de Cierre',
          message: data.error?.message || 'Error al cerrar caja',
          variant: 'danger',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Guardar Movimiento (Sencillo, Gasto o Extracción a Sobre)
  const handleCreateMovement = async (type: string) => {
    if (!movementAmount || Number(movementAmount) <= 0 || !movementDescription.trim()) {
      await customAlert({
        title: 'Datos Incompletos',
        message: 'El monto debe ser mayor a cero y el motivo o justificación es obligatorio.',
        variant: 'warning',
      });
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
        await customAlert({
          title: 'Error de Movimiento',
          message: data.error?.message || 'Error al registrar movimiento',
          variant: 'danger',
        });
      }
    } finally {
      setSavingMovement(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Barra de Título, Modo Ceguera y Conmutador de Vistas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-card-border p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-2.5">
          <Landmark className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-base font-bold text-foreground font-sans">
              Control de Turnos de Caja, Tesorería & Arqueos a Ciegas
            </h2>
            <p className="text-[11px] text-muted-foreground font-mono">
              Terminal: {shiftData?.register?.name || 'Caja Mostrador Central'} ({shiftData?.register?.code || 'CAJA-01'})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            <span>{showHistoryView ? 'Volver al Turno' : 'Historial de Cierres'}</span>
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
                  <th className="py-2.5 px-3 text-right">Gastos / Salidas</th>
                  <th className="py-2.5 px-3 text-right">Sobres Fuerte</th>
                  <th className="py-2.5 px-3 text-right">Declarado Cajón</th>
                  <th className="py-2.5 px-3 text-center">Diferencia</th>
                  <th className="py-2.5 px-3 text-center">Billetaje</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border text-muted-foreground">
                {history.map((s: any) => {
                  const diff = Number(s.difference || 0);
                  const hasBreakdown = !!s.cashCountBreakdown;
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
                        {hasBreakdown ? (
                          <button
                            type="button"
                            onClick={() => setSelectedShiftForBreakdown(s)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 border border-primary/30 text-[10px] text-primary hover:bg-primary/20 transition-colors"
                          >
                            <Banknote className="w-3 h-3" />
                            <span>Ver Arqueo</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">-</span>
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
          {/* Alerta de Apertura con Discrepancia Justificada si hubo diferencia al abrir */}
          {currentShift.openingDifference && Number(currentShift.openingDifference) !== 0 && (
            <div className="p-3.5 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-3 text-xs text-warning shadow-md">
              <AlertTriangle className="w-5 h-5 shrink-0 text-warning mt-0.5" />
              <div className="space-y-1 font-mono">
                <p className="font-bold">
                  Apertura Habilitada con Discrepancia Justificada: {Number(currentShift.openingDifference) > 0 ? '+' : ''}{formatCurrencyPYG(Number(currentShift.openingDifference))}
                </p>
                {currentShift.openingNotes && (
                  <p className="text-[11px] text-muted-foreground font-sans">
                    Motivo asentado para auditoría: <strong className="text-foreground">&ldquo;{currentShift.openingNotes}&rdquo;</strong>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tarjetas Métricas en Vivo */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl bg-card border border-card-border">
              <span className="text-[10px] font-mono uppercase text-muted-foreground block">Fondo Apertura</span>
              <p className="text-sm font-bold font-mono text-foreground mt-1">
                {formatCurrencyPYG(metrics?.openingBalance || 0)}
              </p>
              {currentShift.openingDifference && Number(currentShift.openingDifference) !== 0 ? (
                <span className="text-[9px] font-mono text-warning block mt-0.5 font-bold">
                  Dif: {Number(currentShift.openingDifference) > 0 ? '+' : ''}{formatCurrencyPYG(Number(currentShift.openingDifference))}
                </span>
              ) : (
                <span className="text-[9px] font-mono text-emerald-400 block mt-0.5">
                  Cuadrado con cierre previo
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

            {/* Efectivo en Cajón: Ceguera Total con Autorización por PIN 1126 */}
            <div className="p-3 rounded-xl bg-[#0d121c] border-2 border-primary/40 shadow-inner flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase text-primary font-bold flex items-center justify-between">
                <span>Efectivo en Cajón</span>
                {!isRevealed ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPinModal(true);
                      setEnteredPin('');
                      setPinError('');
                    }}
                    className="p-1 rounded text-muted-foreground/60 hover:text-amber-400 hover:bg-card transition-colors"
                    title="Auditoría: Desbloquear con PIN de Supervisor"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsRevealed(false);
                      setRevealSecondsLeft(0);
                    }}
                    className="text-[10px] text-danger hover:underline flex items-center gap-1 font-mono font-bold"
                    title="Volver a bloquear inmediatamente"
                  >
                    <EyeOff className="w-3 h-3" /> Bloquear
                  </button>
                )}
              </span>

              <p className="text-base font-bold font-mono text-emerald-400 mt-1">
                {!isRevealed ? '••••••••' : formatCurrencyPYG(metrics?.expectedCashInDrawer || 0)}
              </p>

              <div className="text-[9px] font-mono mt-0.5">
                {!isRevealed ? (
                  <span className="text-muted-foreground">Protegido (Ceguera Total)</span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1 font-bold">
                    <Clock className="w-3 h-3 shrink-0" /> Ocultando en {revealSecondsLeft}s
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Barra de Acciones Rápidas y Botón de Cierre */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-card border border-card-border p-3 rounded-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground font-semibold uppercase mr-1">
                Movimientos:
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
                <span>+ Sencillo</span>
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
                <span>- Gasto / Salida</span>
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
                <span>Extraer Billetes Grandes a Sobre</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowCloseModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-danger hover:bg-danger/90 text-white text-xs font-mono font-bold shadow-md transition-colors"
            >
              <Lock className="w-4 h-4" />
              <span>Realizar Arqueo & Cerrar Caja</span>
            </button>
          </div>

          {/* Registro de Movimientos de Caja Menor */}
          <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-card-border pb-2">
              <span className="text-xs font-mono uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" /> Asientos de Caja Menor & Extracciones del Turno
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                {currentShift.movements?.length || 0} movimientos registrados
              </span>
            </div>

            {(!currentShift.movements || currentShift.movements.length === 0) ? (
              <p className="text-xs text-muted-foreground text-center py-10 font-sans">
                No hay movimientos de caja menor registrados en este turno.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
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
        </div>
      ) : (
        /* VISTA: CAJA CERRADA -> FORMULARIO DE APERTURA CON CEGUERA TOTAL */
        <div className="bg-card border border-card-border rounded-xl p-6 max-w-3xl mx-auto space-y-5 shadow-xl">
          <div className="border-b border-card-border pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Unlock className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-sm font-bold text-foreground font-sans">
                  Apertura Diaria de Caja con Comprobación a Ciegas
                </h3>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Cuente físicamente el dinero que encuentra en el cajón. El sistema contrasta el monto a ciegas.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-[#0d121c] p-1 rounded-lg border border-card-border">
              <button
                type="button"
                onClick={() => setOpeningMethod('calculator')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                  openingMethod === 'calculator'
                    ? 'bg-primary text-white font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Billetaje</span>
              </button>
              <button
                type="button"
                onClick={() => setOpeningMethod('direct')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                  openingMethod === 'direct'
                    ? 'bg-primary text-white font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Monto Directo</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleOpenShift} className="space-y-4 text-xs font-mono">
            {openingMethod === 'calculator' ? (
              <BanknoteCounter
                values={openingBreakdown}
                onChange={setOpeningBreakdown}
              />
            ) : (
              <div className="space-y-3 bg-[#0d121c] p-4 rounded-xl border border-card-border">
                <label className="block text-[11px] font-mono text-muted-foreground">
                  Efectivo Total Físico Encontrado en el Cajón (₲) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  placeholder="Ingrese el monto total en guaraníes..."
                  className="w-full bg-card border border-card-border rounded-md px-3 py-2 font-mono text-foreground text-lg font-bold focus:outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                Observaciones Iniciales (Opcional)
              </label>
              <input
                type="text"
                value={openingNotes}
                onChange={(e) => setOpeningNotes(e.target.value)}
                placeholder="Ej: Billetes en fajos verificados al recibir el turno"
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-2 text-foreground text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={loading || (openingMethod === 'direct' && openingBalance === '')}
              className="w-full py-3 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <Unlock className="w-4 h-4" />
              <span>Confirmar Conteo Inicial e Iniciar Turno del Día</span>
            </button>
          </form>
        </div>
      )}

      {/* MODAL PRINCIPAL: ARQUEO FÍSICO DE CIERRE A CIEGAS CON BILLETAJE */}
      {showCloseModal && currentShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-card-border rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden p-5 space-y-4 text-xs font-mono my-8">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <div className="flex items-center gap-2.5">
                <Lock className="w-5 h-5 text-danger" />
                <div>
                  <h3 className="text-sm font-bold text-foreground font-sans">
                    Arqueo Físico de Cierre a Ciegas
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Cuente y declare los billetes y monedas que quedan en el cajón del mostrador.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted/30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Aviso de seguridad: El saldo esperado se mantiene oculto */}
            <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-amber-300 text-[11px]">
              <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                <strong>Control de Ceguera Activo:</strong> El sistema calculará el cuadre de caja comparando su declaración física contra las ventas registradas una vez congelado el cierre.
              </span>
            </div>

            {/* Selector de Método: Billetaje vs Monto Directo */}
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs text-muted-foreground font-sans">Método de Declaración:</span>
              <div className="flex items-center gap-1 bg-[#0d121c] p-1 rounded-lg border border-card-border">
                <button
                  type="button"
                  onClick={() => setClosingMethod('calculator')}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded text-[11px] font-mono transition-colors ${
                    closingMethod === 'calculator'
                      ? 'bg-primary text-white font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Calculadora de Billetaje (Recomendado)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setClosingMethod('direct')}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded text-[11px] font-mono transition-colors ${
                    closingMethod === 'direct'
                      ? 'bg-primary text-white font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Monto Directo</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-4">
              {closingMethod === 'calculator' ? (
                <BanknoteCounter
                  values={closingBreakdown}
                  onChange={setClosingBreakdown}
                />
              ) : (
                <div className="space-y-3 bg-[#0d121c] p-4 rounded-xl border border-card-border">
                  <label className="block text-[11px] font-mono text-muted-foreground">
                    Efectivo Total Físico en Cajón (₲) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={closingBalance}
                    onChange={(e) => setClosingBalance(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    placeholder="Ingrese el monto exacto contado..."
                    className="w-full bg-card border border-card-border rounded-md px-3 py-2 font-mono text-foreground text-lg font-bold focus:outline-none focus:border-danger [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
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
                  placeholder="Ej: Arqueo conforme ante cambio de turno"
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-2 text-foreground text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 rounded-lg border border-card-border text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || (closingMethod === 'direct' && closingBalance === '')}
                  className="px-5 py-2 rounded-lg bg-danger hover:bg-danger/80 text-white font-bold flex items-center gap-2 shadow-md transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  <span>Confirmar Arqueo Físico y Cerrar Caja</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DISCREPANCIA EN APERTURA DE CAJA (RESOLUCIÓN DE CONTEO) */}
      {mismatchOpeningData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-card border-2 border-warning/50 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden p-6 space-y-4 font-mono text-xs">
            <div className="flex items-start justify-between border-b border-card-border pb-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-foreground font-sans">
                    Discrepancia en Conteo Inicial de Caja
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    El monto físico declarado no coincide con el saldo de cierre anterior.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMismatchOpeningData(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Aviso Destacado de Advertencia */}
            <div className="p-3.5 rounded-lg bg-warning/15 border border-warning/40 flex items-start gap-3 text-warning">
              <AlertTriangle className="w-5 h-5 shrink-0 text-warning mt-0.5" />
              <div className="space-y-1 font-sans text-xs">
                <p className="font-bold text-sm">
                  Se detectó una diferencia de {mismatchOpeningData.diff > 0 ? '+' : ''}{formatCurrencyPYG(mismatchOpeningData.diff)} respecto al cierre anterior.
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Para habilitar la caja, debe ingresar el <strong>motivo obligatorio para la auditoría</strong> (Ej: &ldquo;Faltante de 50.000 Gs. retirado por Fátima anoche para cambio de flete&rdquo;).
                </p>
              </div>
            </div>

            {/* Tarjeta de Comparación */}
            <div className="p-3.5 rounded-lg bg-[#0d121c] border border-card-border space-y-2">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Efectivo Contado Físicamente:</span>
                <span className="text-foreground font-bold text-sm">
                  {formatCurrencyPYG(mismatchOpeningData.declared)}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Saldo del Cierre Anterior:</span>
                <span className="text-foreground font-bold text-sm">
                  {formatCurrencyPYG(mismatchOpeningData.expected)}
                </span>
              </div>

              <div className="pt-2 border-t border-card-border flex justify-between items-center text-sm font-bold">
                <span>Diferencia Registrada:</span>
                {mismatchOpeningData.diff < 0 ? (
                  <span className="text-danger flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    Faltante: -{formatCurrencyPYG(Math.abs(mismatchOpeningData.diff))}
                  </span>
                ) : (
                  <span className="text-accent flex items-center gap-1">
                    <Plus className="w-4 h-4" />
                    Sobrante: +{formatCurrencyPYG(mismatchOpeningData.diff)}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-warning font-semibold mb-1">
                Motivo / Justificación obligatoria para Auditoría *
              </label>
              <input
                type="text"
                autoFocus
                value={mismatchOpeningData.notes}
                onChange={(e) =>
                  setMismatchOpeningData({ ...mismatchOpeningData, notes: e.target.value })
                }
                placeholder="Ej: Faltante de 50.000 Gs. retirado por Fátima anoche para cambio de flete"
                className="w-full bg-[#0d121c] border border-warning/50 rounded-md px-3 py-2 text-foreground text-xs focus:outline-none focus:border-warning"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-card-border">
              <button
                type="button"
                onClick={() => setMismatchOpeningData(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg border border-card-border bg-[#0d121c] text-muted-foreground hover:text-foreground text-xs font-semibold"
              >
                Recontar Billetes
              </button>
              <button
                type="button"
                disabled={loading || !mismatchOpeningData.notes.trim()}
                onClick={() => {
                  if (!mismatchOpeningData.notes.trim()) {
                    customAlert({
                      title: 'Justificación Requerida',
                      message: 'Debe ingresar el motivo de la diferencia para poder habilitar la caja en el sistema.',
                      variant: 'warning',
                    });
                    return;
                  }
                  executeOpenShift(
                    mismatchOpeningData.declared,
                    mismatchOpeningData.notes.trim()
                  );
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-warning hover:bg-warning/80 text-black font-bold text-xs shadow-md transition-colors disabled:opacity-50"
              >
                Confirmar y Habilitar Caja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INGRESO DE PIN DE SUPERVISOR (1126) PARA AUDITORÍA */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-card border-2 border-primary/50 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden p-6 space-y-4 font-mono text-xs text-foreground">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <div className="flex items-center gap-2.5">
                <Lock className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-foreground font-sans">
                    Autorización de Supervisor
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Control de Auditoría de Efectivo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPinModal(false);
                  setEnteredPin('');
                  setPinError('');
                }}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground font-sans leading-relaxed">
              Ingrese el PIN de seguridad de gerencia para auditar el saldo teórico en cajón durante 30 segundos.
            </p>

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  autoFocus
                  required
                  placeholder="••••"
                  value={enteredPin}
                  onChange={(e) => {
                    setEnteredPin(e.target.value.replace(/\D/g, ''));
                    setPinError('');
                  }}
                  className="w-full text-center text-3xl tracking-[0.5em] font-bold bg-[#0d121c] border-2 border-card-border focus:border-primary rounded-xl py-3 text-primary focus:outline-none shadow-inner"
                />
                {pinError && (
                  <p className="text-danger text-[11px] font-bold text-center mt-2 flex items-center justify-center gap-1 font-sans">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{pinError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setEnteredPin('');
                    setPinError('');
                  }}
                  className="px-4 py-2 rounded-lg border border-card-border bg-[#0d121c] text-muted-foreground hover:text-foreground text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enteredPin.length < 4}
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-md transition-colors disabled:opacity-40"
                >
                  Verificar PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMACIÓN PERSONALIZADA DE CIERRE DE CAJA (SIN POPUP NATIVO) */}
      {pendingCloseAmount !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-card border-2 border-danger/50 rounded-xl shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4 font-mono text-xs">
            <div className="flex items-center gap-2.5 border-b border-card-border pb-3">
              <Lock className="w-5 h-5 text-danger shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-foreground font-sans">
                  ¿Confirmar Arqueo Físico y Cierre Definitivo?
                </h3>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Esta acción congelará el turno de forma inmutable.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#0d121c] border border-card-border space-y-2">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Total Físico en Cajón:</span>
                <span className="text-emerald-400 font-bold text-base">
                  {formatCurrencyPYG(pendingCloseAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                <span>Método de Arqueo:</span>
                <span className="text-foreground">
                  {closingMethod === 'calculator' ? 'Calculadora de Billetaje' : 'Monto Directo Global'}
                </span>
              </div>
              {closingNotes && (
                <div className="pt-2 border-t border-card-border text-[11px] text-muted-foreground">
                  <span>Nota: &ldquo;{closingNotes}&rdquo;</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed font-sans">
              Una vez confirmada, la caja quedará congelada e inmutable para auditoría. El sistema contrastará su declaración contra las ventas cobradas durante el día para emitir el acta final.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-card-border">
              <button
                type="button"
                onClick={() => setPendingCloseAmount(null)}
                className="px-4 py-2 rounded-lg border border-card-border bg-[#0d121c] text-muted-foreground hover:text-foreground text-xs font-semibold"
              >
                Volver a Revisar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={executeCloseShift}
                className="px-4 py-2 rounded-lg bg-danger hover:bg-danger/80 text-white font-bold text-xs shadow-md transition-colors"
              >
                {loading ? 'Cerrando...' : 'Confirmar Cierre Inmutable'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RESULTADO FINAL DE AUDITORÍA POST-CIERRE */}
      {showClosingSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-card-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden p-5 space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-foreground font-sans">
                  Acta de Cierre Inmutable & Arqueo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClosingSuccessModal(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-[#0d121c] border border-card-border space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Efectivo Físico Declarado:</span>
                <span className="text-foreground font-bold">{formatCurrencyPYG(Number(showClosingSuccessModal.closingBalance || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Efectivo Esperado por Sistema:</span>
                <span className="text-foreground font-bold">{formatCurrencyPYG(Number(showClosingSuccessModal.expectedBalance || 0))}</span>
              </div>

              <div className="pt-2 border-t border-card-border flex justify-between items-center text-sm">
                <span className="font-sans font-semibold">Resultado del Arqueo:</span>
                {Number(showClosingSuccessModal.difference || 0) === 0 ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Caja Cuadrada
                  </span>
                ) : Number(showClosingSuccessModal.difference || 0) > 0 ? (
                  <span className="text-accent font-bold">
                    Sobrante: +{formatCurrencyPYG(Number(showClosingSuccessModal.difference))}
                  </span>
                ) : (
                  <span className="text-danger font-bold flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    Faltante: {formatCurrencyPYG(Number(showClosingSuccessModal.difference))}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1 text-[11px] text-muted-foreground">
              <p>&bull; Ventas en efectivo del turno: <strong>{formatCurrencyPYG(Number(showClosingSuccessModal.totalCashSales || 0))}</strong></p>
              <p>&bull; Gastos / Adelantos deducidos: <strong>{formatCurrencyPYG(Number(showClosingSuccessModal.totalExpenses || 0))}</strong></p>
              <p>&bull; Billetes resguardados en sobres: <strong>{formatCurrencyPYG(Number(showClosingSuccessModal.totalSafeDeposits || 0))}</strong></p>
              {showClosingSuccessModal.closingNotes && (
                <p>&bull; Observaciones: &ldquo;{showClosingSuccessModal.closingNotes}&rdquo;</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowClosingSuccessModal(null)}
              className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold font-sans transition-colors"
            >
              Aceptar y Continuar
            </button>
          </div>
        </div>
      )}

      {/* MODAL PARA VER DETALLE DE BILLETAJE DESDE EL HISTORIAL */}
      {selectedShiftForBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-card-border rounded-xl shadow-2xl max-w-xl w-full p-5 space-y-4 text-xs font-mono my-8">
            <div className="flex items-center justify-between border-b border-card-border pb-2.5">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground font-sans">
                  Desglose de Billetaje Declarado en Arqueo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedShiftForBreakdown(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Billetes */}
              <div className="bg-[#0d121c] p-3 rounded-lg border border-card-border space-y-1.5">
                <span className="text-[11px] font-bold text-foreground uppercase block mb-1">Billetes Contados</span>
                {BILL_DENOMINATIONS.map((b) => {
                  const qty = selectedShiftForBreakdown.cashCountBreakdown?.[b.key] || 0;
                  return (
                    <div key={b.key} className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">{b.label}:</span>
                      <span>
                        <strong className="text-foreground">{qty}</strong> u. = {formatCurrencyPYG(qty * b.value)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Monedas */}
              <div className="bg-[#0d121c] p-3 rounded-lg border border-card-border space-y-1.5">
                <span className="text-[11px] font-bold text-foreground uppercase block mb-1">Monedas Contadas</span>
                {COIN_DENOMINATIONS.map((m) => {
                  const qty = selectedShiftForBreakdown.cashCountBreakdown?.[m.key] || 0;
                  return (
                    <div key={m.key} className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">{m.label}:</span>
                      <span>
                        <strong className="text-foreground">{qty}</strong> u. = {formatCurrencyPYG(qty * m.value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-2.5 rounded bg-card border border-card-border flex justify-between items-center">
              <span className="text-muted-foreground">Total Físico Declarado:</span>
              <span className="text-base font-bold text-emerald-400">
                {formatCurrencyPYG(Number(selectedShiftForBreakdown.closingBalance || 0))}
              </span>
            </div>

            <div className="flex justify-end pt-2 border-t border-card-border">
              <button
                type="button"
                onClick={() => setSelectedShiftForBreakdown(null)}
                className="px-4 py-1.5 rounded-md bg-[#0d121c] border border-card-border text-foreground hover:bg-card"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: INGRESO DE SENCILLO */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-card-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden p-5 space-y-3.5 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-card-border pb-2.5">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground font-sans">Ingreso de Sencillo / Cambio</h3>
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
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground text-sm font-bold focus:outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                className="px-4 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white font-semibold flex items-center gap-1.5 font-sans"
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
          <div className="bg-card border border-card-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden p-5 space-y-3.5 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-card-border pb-2.5">
              <div className="flex items-center gap-2">
                <Minus className="w-4 h-4 text-danger" />
                <h3 className="text-sm font-bold text-foreground font-sans">Salida de Dinero / Gasto de Caja</h3>
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
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground text-sm font-bold focus:outline-none focus:border-danger [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                placeholder="Ej: Adelanto de sueldo semanal autorizado"
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
                className="px-4 py-1.5 rounded-md bg-danger hover:bg-danger/80 text-white font-semibold flex items-center gap-1.5 font-sans"
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
          <div className="bg-card border border-card-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden p-5 space-y-3.5 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-card-border pb-2.5">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-bold text-foreground font-sans">Extracción de Billetes Grandes a Sobre</h3>
              </div>
              <button type="button" onClick={() => setShowSafeDepositModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 rounded bg-[#0d121c] border border-card-border text-muted-foreground text-[11px] leading-relaxed font-sans">
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
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground text-sm font-bold focus:outline-none focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
              {[500000, 1000000, 2000000, 3000000, 5000000].map((amt) => (
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
                className="px-4 py-1.5 rounded-md bg-accent hover:bg-accent/80 text-foreground font-semibold flex items-center gap-1.5 font-sans"
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

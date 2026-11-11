'use client';

import React from 'react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { numberToWordsPYG } from '@/shared/utils/number-to-words';

export interface SettlementEmployeeData {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  jobTitle: string;
  phone?: string | null;
  weeklySalary: number;
  advances: Array<{
    id: string;
    amount: number;
    requestDate: string | Date;
    reason: string;
    notes?: string | null;
  }>;
  totalAdvances: number;
  loanDeductions?: Array<{
    loanId: string;
    installmentId: string;
    loanNumber: string;
    installmentNumber: number;
    totalInstallments: number;
    amount: number;
    originalBalance: number;
    remainingBalance: number;
    scheduledDate: string | Date;
  }>;
  totalLoans?: number;
  totalDeductions?: number;
  netPayable: number;
}

interface WeeklyReceiptA4Props {
  settlement: SettlementEmployeeData;
  period: {
    startDate: string;
    endDate: string;
  };
}

export function WeeklyReceiptA4({ settlement, period }: WeeklyReceiptA4Props) {
  if (!settlement) return null;

  const totalInWords = numberToWordsPYG(settlement.netPayable);

  // Formato de fechas para el periodo
  const formatDateStr = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dStr);
    return d.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const periodLabel = `Semana del ${formatDateStr(period.startDate)} al ${formatDateStr(period.endDate)}`;
  const emissionDate = new Date().toLocaleDateString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const renderSingleReceipt = (copyType: 'ORIGINAL' | 'DUPLICADO') => {
    const isOriginal = copyType === 'ORIGINAL';

    return (
      <div className="relative border border-black p-3 bg-white text-black font-sans text-[10px] leading-tight flex flex-col justify-between h-[132mm] max-h-[132mm] box-border overflow-hidden">
        {/* Banda lateral para archivo */}
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 -rotate-90 text-[7px] font-mono tracking-widest text-neutral-500 uppercase select-none pointer-events-none">
          {isOriginal ? 'Original - Funcionario' : 'Duplicado - Archivo Administración Depósito'}
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
              {isOriginal ? 'ORIGINAL (PERSONAL)' : 'DUPLICADO (ADMINISTRACIÓN)'}
            </span>
            <div className="text-xs font-black uppercase tracking-wider text-black mt-1">
              RECIBO DE SALARIO SEMANAL
            </div>
            <div className="text-[8.5px] font-bold text-neutral-800 font-mono">
              {periodLabel}
            </div>
            <div className="text-[8px] font-mono text-neutral-600 mt-0.5">
              Fecha de Emisión: {emissionDate}
            </div>
          </div>
        </div>

        {/* ================= BLOQUE 2: DATOS DEL FUNCIONARIO ================= */}
        <div className="border-b border-black text-[9px] grid grid-cols-12 py-1.5 gap-y-1">
          <div className="col-span-7">
            <span className="font-bold">Funcionario: </span>
            <span className="font-semibold uppercase">{settlement.lastName}, {settlement.firstName}</span>
          </div>
          <div className="col-span-5 text-right">
            <span className="font-bold">Cédula de Identidad N°: </span>
            <span className="font-mono font-bold">{settlement.documentNumber || 'S/D'}</span>
          </div>

          <div className="col-span-7">
            <span className="font-bold">Cargo / Función: </span>
            <span className="font-medium">{settlement.jobTitle || 'Operativo de Depósito'}</span>
          </div>
          <div className="col-span-5 text-right">
            <span className="font-bold">Legajo / Código: </span>
            <span className="font-mono font-bold">{settlement.code}</span>
          </div>
        </div>

        {/* ================= BLOQUE 3: CUADRO DE HABERES Y DESCUENTOS POR VALES ================= */}
        <div className="flex-1 py-1.5 flex flex-col justify-between">
          <div className="border border-black">
            <div className="bg-neutral-100 border-b border-black grid grid-cols-12 text-[8px] font-bold font-mono py-1 px-2 uppercase">
              <div className="col-span-6">Concepto / Detalle</div>
              <div className="col-span-2 text-center">Fecha Vale</div>
              <div className="col-span-2 text-right">Haberes (+)</div>
              <div className="col-span-2 text-right">Vales / Deduc. (-)</div>
            </div>

            {/* Fila: Salario Semanal Base */}
            <div className="grid grid-cols-12 text-[8.5px] font-mono py-1 px-2 border-b border-neutral-300 items-center">
              <div className="col-span-6 font-semibold">Salario Semanal Convenido</div>
              <div className="col-span-2 text-center text-neutral-500">—</div>
              <div className="col-span-2 text-right font-bold text-black">
                {formatCurrencyPYG(settlement.weeklySalary)}
              </div>
              <div className="col-span-2 text-right text-neutral-400">0</div>
            </div>

            {/* Filas: Vales / Adelantos Retirados en la Semana */}
            {settlement.advances.length === 0 ? (
              <div className="py-2 text-center text-[8px] font-mono text-neutral-500 italic border-b border-neutral-300">
                (Sin adelantos ni vales registrados en la semana)
              </div>
            ) : (
              settlement.advances.map((adv, idx) => {
                const advDate = new Date(adv.requestDate);
                const dFmt = advDate.toLocaleDateString('es-PY', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                });
                return (
                  <div
                    key={adv.id || idx}
                    className="grid grid-cols-12 text-[8px] font-mono py-0.5 px-2 border-b border-neutral-200 items-center"
                  >
                    <div className="col-span-6 text-neutral-800">
                      &bull; Vale en Efectivo: <span className="font-sans italic">{adv.reason}</span>
                    </div>
                    <div className="col-span-2 text-center font-bold text-neutral-700">
                      {dFmt}
                    </div>
                    <div className="col-span-2 text-right text-neutral-400">0</div>
                    <div className="col-span-2 text-right font-bold text-red-700">
                      -{formatCurrencyPYG(adv.amount)}
                    </div>
                  </div>
                );
              })
            )}

            {/* Filas: Cuotas de Préstamo al Personal */}
            {settlement.loanDeductions && settlement.loanDeductions.length > 0 && (
              settlement.loanDeductions.map((loan, idx) => (
                <div
                  key={loan.installmentId || idx}
                  className="grid grid-cols-12 text-[8px] font-mono py-0.5 px-2 border-b border-neutral-200 items-center bg-amber-50/40"
                >
                  <div className="col-span-6 text-neutral-800">
                    &bull; <strong>Préstamo {loan.loanNumber}:</strong> Cuota {loan.installmentNumber} de {loan.totalInstallments} (Saldo rest: {formatCurrencyPYG(loan.remainingBalance)})
                  </div>
                  <div className="col-span-2 text-center font-bold text-amber-800">
                    Cuota {loan.installmentNumber}/{loan.totalInstallments}
                  </div>
                  <div className="col-span-2 text-right text-neutral-400">0</div>
                  <div className="col-span-2 text-right font-bold text-red-700">
                    -{formatCurrencyPYG(loan.amount)}
                  </div>
                </div>
              ))
            )}

            {/* Fila de Totales de Haberes y Vales / Deducciones */}
            <div className="bg-neutral-50 grid grid-cols-12 text-[8.5px] font-mono font-bold py-1 px-2 border-t border-black">
              <div className="col-span-8 text-right uppercase">Subtotales / Total Deducciones:</div>
              <div className="col-span-2 text-right text-black">{formatCurrencyPYG(settlement.weeklySalary)}</div>
              <div className="col-span-2 text-right text-red-700">
                -{formatCurrencyPYG(settlement.totalDeductions !== undefined ? settlement.totalDeductions : (settlement.totalAdvances + (settlement.totalLoans || 0)))}
              </div>
            </div>
          </div>

          {/* ================= BLOQUE 4: TOTAL NETO A COBRAR ================= */}
          <div className="mt-1.5 p-2 bg-neutral-100 border border-black flex items-center justify-between">
            <div className="text-[8px] font-mono">
              <span className="font-bold text-black">SON GUARANÍES: </span>
              <span className="font-extrabold text-neutral-900 uppercase">{totalInWords} GUARANÍES.-</span>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-mono font-bold block uppercase text-neutral-700">LÍQUIDO A COBRAR:</span>
              <span className="text-sm font-black font-mono text-black">
                {formatCurrencyPYG(settlement.netPayable)}
              </span>
            </div>
          </div>
        </div>

        {/* ================= BLOQUE 5: CLÁUSULA DE CONFORMIDAD Y FIRMAS ================= */}
        <div className="border-t border-black pt-1 mt-1 text-[7.5px] text-neutral-800 leading-tight">
          <p className="italic text-justify">
            Recibí de <strong>DEPÓSITO 4 DE MARZO S.A.</strong> la cantidad neta indicada de <strong>{formatCurrencyPYG(settlement.netPayable)}</strong> en concepto de pago de mis haberes de la semana correspondiente, manifestando mi expresa conformidad con los descuentos de adelantos y vales precedentemente detallados, no teniendo reclamo alguno que formular.
          </p>

          <div className="grid grid-cols-2 gap-8 pt-6 pb-1 text-center font-mono text-[8px]">
            <div>
              <div className="border-t border-black pt-0.5">
                <span className="font-bold block uppercase">Firma del Funcionario</span>
                <span className="text-[7.5px] text-neutral-700 font-sans">
                  Aclaración: {settlement.firstName} {settlement.lastName} &bull; C.I.: {settlement.documentNumber}
                </span>
              </div>
            </div>

            <div>
              <div className="border-t border-black pt-0.5">
                <span className="font-bold block uppercase">Depósito 4 de Marzo S.A.</span>
                <span className="text-[7.5px] text-neutral-700 font-sans">
                  Administración / Pagaduría
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="printable-weekly-receipt" className="w-full max-w-[196mm] mx-auto bg-white p-0 space-y-1 box-border">
      {/* Copia 1: ORIGINAL (Superior) */}
      {renderSingleReceipt('ORIGINAL')}

      {/* Línea de corte / Perforación central */}
      <div className="w-full flex items-center justify-between text-[7px] font-mono text-neutral-400 select-none py-0.5 border-t border-b border-dashed border-neutral-300 my-0.5">
        <span>&bull; &bull; &bull; TIJERA / CORTAR AQUÍ</span>
        <span className="tracking-widest uppercase font-bold text-neutral-500">
          - - - - - - - - - - - - - - - LÍNEA DE CORTE - - - - - - - - - - - - - - -
        </span>
        <span>ORIGINAL ARRIBA / DUPLICADO ABAJO &bull; &bull; &bull;</span>
      </div>

      {/* Copia 2: DUPLICADO (Inferior) */}
      {renderSingleReceipt('DUPLICADO')}
    </div>
  );
}


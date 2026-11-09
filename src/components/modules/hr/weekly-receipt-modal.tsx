'use client';

import React from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { WeeklyReceiptA4, SettlementEmployeeData } from './weekly-receipt-a4';

interface WeeklyReceiptModalProps {
  settlement: SettlementEmployeeData | null;
  period: {
    startDate: string;
    endDate: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function WeeklyReceiptModal({ settlement, period, isOpen, onClose }: WeeklyReceiptModalProps) {
  if (!isOpen || !settlement) return null;

  const handlePrint = () => {
    // Agregar clase al body para activar CSS de impresión A4
    document.body.classList.add('printing-weekly-receipt');
    window.print();
    // Quitar después de la ventana de impresión
    setTimeout(() => {
      document.body.classList.remove('printing-weekly-receipt');
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-card border border-card-border rounded-xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera del Modal (No imprimible) */}
        <div className="p-4 border-b border-card-border bg-[#0b0e14] flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Recibo Semanal de Salarios & Vales — Hoja A4 en Duplicado
              </h3>
              <p className="text-[11px] text-muted-foreground font-mono">
                {settlement.firstName} {settlement.lastName} &bull; C.I.: {settlement.documentNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-md transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Recibo (A4 Duplicado)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/20"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contenido Visualizador del Recibo A4 */}
        <div className="p-4 bg-neutral-900/50 overflow-x-auto max-h-[82vh]">
          <div className="flex justify-center shadow-lg">
            <WeeklyReceiptA4 settlement={settlement} period={period} />
          </div>
        </div>
      </div>
    </div>
  );
}

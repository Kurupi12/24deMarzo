'use client';

import React, { useState } from 'react';
import { X, Printer, FileText, FileDown, Loader2 } from 'lucide-react';
import { WeeklyReceiptA4, SettlementEmployeeData } from './weekly-receipt-a4';
import { printElementById } from '@/shared/utils/print-html';
import { downloadElementAsPdf } from '@/shared/utils/pdf-export';

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
  const [exportingPdf, setExportingPdf] = useState(false);

  if (!isOpen || !settlement) return null;

  const baseFileName = `Recibo_Semanal_${settlement.firstName}_${settlement.lastName}`;

  const handlePrint = () => {
    printElementById('printable-weekly-receipt', {
      paperSize: 'A4',
      title: baseFileName,
      pageMargin: '0',
    });
  };

  const handleDownloadPdf = async () => {
    setExportingPdf(true);
    try {
      await downloadElementAsPdf('printable-weekly-receipt', {
        fileName: baseFileName,
        paperSize: 'A4',
      });
    } finally {
      setExportingPdf(false);
    }
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
                Recibo Semanal de Salarios & Vales — Original Único (Control Interno)
              </h3>
              <p className="text-[11px] text-muted-foreground font-mono">
                {settlement.firstName} {settlement.lastName} &bull; C.I.: {settlement.documentNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={exportingPdf}
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0d121c] border border-sky-500/40 text-sky-300 hover:bg-[#172133] text-xs font-semibold shadow transition-colors disabled:opacity-50"
            >
              {exportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              <span>Descargar PDF</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-md transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Recibo Único</span>
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
        <div className="p-4 bg-[#06080d] overflow-auto max-h-[82vh]">
          <div className="w-fit mx-auto bg-white rounded-sm shadow-2xl overflow-hidden border border-neutral-300">
            <WeeklyReceiptA4 settlement={settlement} period={period} />
          </div>
        </div>
      </div>
    </div>
  );
}


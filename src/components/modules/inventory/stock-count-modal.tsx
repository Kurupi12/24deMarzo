'use client';

import React, { useState } from 'react';
import { Printer, FileDown, X, ClipboardCheck, Trash2, Loader2 } from 'lucide-react';
import { downloadElementAsPdf } from '@/shared/utils/pdf-export';

export interface StockCountProductItem {
  id: string;
  sku: string;
  name: string;
  unitOfMeasure: string;
  currentStock: number;
}

interface StockCountModalProps {
  isOpen: boolean;
  items: StockCountProductItem[];
  onClose: () => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
}

export function StockCountModal({
  isOpen,
  items,
  onClose,
  onRemoveItem,
  onClearAll,
}: StockCountModalProps) {
  const [areaLabel, setAreaLabel] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  if (!isOpen) return null;

  const now = new Date();
  const formattedDate = now.toLocaleDateString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = now.toLocaleTimeString('es-PY', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handlePrint = () => {
    document.body.classList.add('printing-stock-count');
    const cleanup = () => {
      document.body.classList.remove('printing-stock-count');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => {
      window.print();
    }, 80);
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const dateSlug = formattedDate.replace(/\//g, '-');
      await downloadElementAsPdf('printable-stock-count-sheet', {
        fileName: `Control_Stock_${dateSlug}`,
        paperSize: 'A4',
        lightMode: false,
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div
      id="printable-stock-count-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
    >
      <div
        id="printable-stock-count-dialog"
        className="bg-card border border-card-border rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Barra superior de acciones (oculta al imprimir) */}
        <div className="no-print px-5 py-3.5 bg-[#0b0e14] border-b border-card-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/15 border border-primary/30 text-primary">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Planilla de Control de Stock Físico ({items.length} productos)
              </h3>
              <p className="text-[11px] font-mono text-muted-foreground">
                Hoja A4 lista para imprimir y anotar la existencia real en depósito
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={items.length === 0}
              className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 shadow disabled:opacity-40 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Hoja A4</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf || items.length === 0}
              className="px-3 py-1.5 rounded-md bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 transition-colors"
            >
              {downloadingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>{downloadingPdf ? 'Generando PDF...' : 'Descargar PDF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md border border-card-border text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
              aria-label="Cerrar planilla"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Controles rápidos previos a imprimir */}
        <div className="no-print px-5 py-2.5 bg-[#0d121c] border-b border-card-border flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
            <label className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
              Área / Sector (opcional):
            </label>
            <input
              type="text"
              value={areaLabel}
              onChange={(e) => setAreaLabel(e.target.value)}
              placeholder="Ej: Patio Cementos, Cal, Varillas y Ladrillos"
              className="w-full bg-card border border-card-border rounded px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
            />
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onClearAll();
                onClose();
              }}
              className="text-[11px] font-mono text-red-400 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Vaciar selección</span>
            </button>
          )}
        </div>

        {/* Vista previa de la hoja A4 imprimible */}
        <div
          id="printable-stock-count-scroll"
          className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/60"
        >
          {items.length === 0 ? (
            <div className="p-10 text-center text-xs text-muted-foreground font-mono">
              No hay productos seleccionados en la planilla.
            </div>
          ) : (
            <div
              id="printable-stock-count-sheet"
              className="bg-white text-black mx-auto max-w-[210mm] p-6 sm:p-8 rounded shadow-lg font-sans"
            >
              {/* Encabezado oficial de planilla */}
              <div className="border-b-2 border-black pb-3 mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-lg font-black uppercase tracking-wide text-black">
                    Depósito 4 de Marzo
                  </h1>
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-700 mt-0.5">
                    Planilla de Control de Stock Físico
                  </p>
                  {areaLabel.trim() && (
                    <p className="text-xs font-semibold text-black mt-1">
                      Sector / Área: {areaLabel.trim()}
                    </p>
                  )}
                </div>

                <div className="text-right text-xs font-mono text-black space-y-0.5">
                  <div>
                    <strong>Fecha:</strong> {formattedDate} &bull; {formattedTime}
                  </div>
                  <div>
                    <strong>Ítems a controlar:</strong> {items.length}
                  </div>
                </div>
              </div>

              {/* Tabla imprimible con columnas amplias para escritura manual */}
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-100 text-black font-mono text-[10px] uppercase">
                    <th className="border border-black py-2 px-2 text-center w-8">#</th>
                    <th className="border border-black py-2 px-2 text-left w-20">SKU</th>
                    <th className="border border-black py-2 px-2.5 text-left">Producto / Medida</th>
                    <th className="border border-black py-2 px-2.5 text-right w-24">Stock Sistema</th>
                    <th className="border border-black py-2 px-2.5 text-center w-32 bg-neutral-200/70">
                      Stock Físico (Real)
                    </th>
                    <th className="border border-black py-2 px-2.5 text-left w-36">
                      Diferencia / Obs.
                    </th>
                    <th className="no-print border border-black py-2 px-1.5 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id} className="break-inside-avoid">
                      <td className="border border-black py-3 px-2 text-center font-mono text-[11px] text-neutral-700">
                        {index + 1}
                      </td>
                      <td className="border border-black py-3 px-2 font-mono font-bold text-[11px] text-black whitespace-nowrap">
                        {item.sku}
                      </td>
                      <td className="border border-black py-3 px-2.5 text-black">
                        <div className="font-semibold leading-snug">{item.name}</div>
                        <div className="text-[10px] font-mono uppercase text-neutral-600">
                          Unidad: {item.unitOfMeasure}
                        </div>
                      </td>
                      <td className="border border-black py-3 px-2.5 text-right font-mono font-bold text-sm text-black whitespace-nowrap">
                        {item.currentStock}
                      </td>
                      <td className="border border-black py-3 px-2.5 bg-white">
                        {/* Espacio en blanco intencional para anotar cantidad real */}
                      </td>
                      <td className="border border-black py-3 px-2.5 bg-white">
                        {/* Espacio en blanco intencional para diferencia u observación */}
                      </td>
                      <td className="no-print border border-black py-2 px-1 text-center">
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          title="Quitar de esta planilla"
                          className="p-1 rounded text-red-600 hover:bg-red-100"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pie para firma de control */}
              <div className="mt-8 pt-4 grid grid-cols-2 gap-8 text-xs text-black">
                <div className="border-t border-black pt-1.5 text-center font-mono text-[11px]">
                  Responsable del Conteo (Firma y Aclaración)
                </div>
                <div className="border-t border-black pt-1.5 text-center font-mono text-[11px]">
                  Control / Carga al Sistema (Firma y Fecha)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

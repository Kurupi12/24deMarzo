'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileSpreadsheet, Eye, ShoppingCart, Trash2, Search, MapPin, ExternalLink } from 'lucide-react';
import { useCustomDialog } from '@/components/common/custom-dialog-provider';

interface QuotationsPanelProps {
  onViewQuotation: (quotation: any) => void;
  onLoadToPos: (quotation: any) => void;
}

export function QuotationsPanel({ onViewQuotation, onLoadToPos }: QuotationsPanelProps) {
  const { confirm: customConfirm, alert: customAlert } = useCustomDialog();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/billing/sales?status=QUOTATION&limit=50');
      const json = await res.json();
      if (json.success) {
        setQuotations(json.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handleDelete = async (q: any) => {
    const ok = await customConfirm({
      title: 'Eliminar Presupuesto',
      message: `¿Seguro que desea eliminar el presupuesto ${q.saleNumber} de ${q.customerName}? Esta acción no afecta el stock.`,
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;

    const res = await fetch(`/api/v1/billing/sales/${q.id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      fetchQuotations();
    } else {
      customAlert({
        title: 'Error',
        message: json.error?.message || 'No se pudo eliminar el presupuesto.',
        variant: 'danger',
      });
    }
  };

  const filtered = quotations.filter((q) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      q.saleNumber.toLowerCase().includes(term) ||
      q.customerName.toLowerCase().includes(term) ||
      q.customerRuc.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-card-border p-4 rounded-lg">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            <span>Presupuestos Guardados (Sin Descuento de Stock)</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cotizaciones preparadas para clientes. Podés imprimirlas o cargarlas directo al carrito POS con 1 clic cuando confirmen la compra.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar presupuesto o cliente..."
            className="w-full bg-[#0d121c] border border-card-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-card border border-card-border rounded-lg p-12 text-center text-xs text-muted-foreground font-mono">
          Cargando presupuestos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-card-border rounded-lg p-12 text-center text-xs text-muted-foreground">
          No hay presupuestos guardados todavía. En la pestaña <strong>Punto de Venta (POS)</strong> podés elegir la opción <strong>Presupuesto</strong> para generar uno sin tocar el inventario.
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0d121c] border-b border-card-border font-mono uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 px-3">N° Presupuesto</th>
                  <th className="py-3 px-3">Cliente / RUC</th>
                  <th className="py-3 px-3">Dirección / Maps</th>
                  <th className="py-3 px-3">Fecha</th>
                  <th className="py-3 px-3 text-center">Ítems</th>
                  <th className="py-3 px-3 text-right">Total Cotizado</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {filtered.map((q) => {
                  const dateStr = format(new Date(q.createdAt), 'dd/MM/yyyy HH:mm', { locale: es });
                  const mapsLink = q.googleMapsUrl || q.project?.googleMapsUrl;
                  return (
                    <tr key={q.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-cyan-400">
                        {q.saleNumber}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-foreground">{q.customerName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{q.customerRuc}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-muted-foreground block truncate max-w-[200px]">
                          {q.customerAddress || q.project?.address || 'Sin dirección'}
                        </span>
                        {mapsLink && (
                          <a
                            href={mapsLink.startsWith('http') ? mapsLink : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsLink)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-mono mt-0.5"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>Ver Maps</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">{dateStr}</td>
                      <td className="py-3 px-3 text-center font-mono">
                        <span className="px-2 py-0.5 rounded bg-muted/40 text-foreground font-bold">
                          {q.items?.length || 0}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                        {formatCurrencyPYG(Number(q.grandTotal))}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onViewQuotation(q)}
                            className="px-2.5 py-1.5 rounded bg-[#0d121c] border border-card-border hover:border-primary text-foreground flex items-center gap-1"
                            title="Previsualizar / Imprimir Presupuesto A4"
                          >
                            <Eye className="w-3.5 h-3.5 text-primary" />
                            <span>Ver / Imprimir</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onLoadToPos(q)}
                            className="px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1"
                            title="Cargar estos productos y cliente en el POS para facturar"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Pasar a Venta</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(q)}
                            className="p-1.5 rounded bg-[#0d121c] border border-card-border hover:border-red-500 text-muted-foreground hover:text-red-400"
                            title="Eliminar presupuesto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

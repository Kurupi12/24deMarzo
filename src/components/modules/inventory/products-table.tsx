'use client';

import React, { useState } from 'react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { Layers, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Pencil, Check, X, Trash2 } from 'lucide-react';
import { useCustomDialog } from '@/components/common/custom-dialog-provider';

interface ProductItem {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description?: string | null;
  unitOfMeasure: string;
  vatRate: string;
  costPrice: string | number;
  salePrice: string | number;
  minStockAlert: string | number;
  stockItems: Array<{ currentStock: string | number; warehouse: { name: string } }>;
}

interface ProductsTableProps {
  products: ProductItem[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onOpenKardex: (product: ProductItem) => void;
  onEditProduct: (product: ProductItem) => void;
  onDeleteProduct: (product: ProductItem) => void;
  onSkuUpdated?: () => void;
}

export function ProductsTable({
  products,
  loading,
  currentPage,
  totalPages,
  onPageChange,
  onOpenKardex,
  onEditProduct,
  onDeleteProduct,
  onSkuUpdated,
}: ProductsTableProps) {
  const { alert: customAlert } = useCustomDialog();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempSku, setTempSku] = useState('');
  const [savingSku, setSavingSku] = useState(false);

  const startEditSku = (p: ProductItem) => {
    setEditingId(p.id);
    setTempSku(p.sku);
  };

  const cancelEditSku = () => {
    setEditingId(null);
    setTempSku('');
  };

  const saveSku = async (productId: string) => {
    if (!tempSku.trim()) return;
    setSavingSku(true);
    try {
      const res = await fetch('/api/v1/inventory/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId, sku: tempSku.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        if (onSkuUpdated) onSkuUpdated();
      } else {
        customAlert({
          title: 'Error de SKU',
          message: data.error?.message || 'Error al actualizar SKU',
          variant: 'danger',
        });
      }
    } finally {
      setSavingSku(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-card-border rounded-lg p-12 text-center text-xs text-muted-foreground font-mono">
        Cargando catálogo maestro desde Neon Postgres...
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-card border border-card-border rounded-lg p-12 text-center text-xs text-muted-foreground">
        No se encontraron productos coincidentes con los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="bg-card border border-card-border rounded-lg overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0d121c] border-b border-card-border text-[11px] font-mono uppercase text-muted-foreground">
            <tr>
              <th className="py-2.5 px-3">SKU</th>
              <th className="py-2.5 px-3">Descripción</th>
              <th className="py-2.5 px-3">Medida</th>
              <th className="py-2.5 px-3">IVA</th>
              <th className="py-2.5 px-3 text-right">Costo Estim.</th>
              <th className="py-2.5 px-3 text-right">Precio Venta</th>
              <th className="py-2.5 px-3 text-right">Stock</th>
              <th className="py-2.5 px-3 text-right">Estado</th>
              <th className="py-2.5 px-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border font-mono text-muted-foreground">
            {products.map((p) => {
              const currentStock = Number(p.stockItems?.[0]?.currentStock ?? 0);
              const minStock = Number(p.minStockAlert ?? 0);
              const isCritical = currentStock <= 0;
              const isLow = currentStock > 0 && currentStock <= minStock;
              const isEditing = editingId === p.id;

              return (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  {/* SKU Editable en línea */}
                  <td className="py-2 px-3 font-bold text-foreground">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={tempSku}
                          autoFocus
                          disabled={savingSku}
                          onChange={(e) => setTempSku(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveSku(p.id);
                            if (e.key === 'Escape') cancelEditSku();
                          }}
                          className="w-24 bg-[#0d121c] border border-primary rounded px-1.5 py-0.5 text-xs text-foreground font-mono focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={savingSku}
                          onClick={() => saveSku(p.id)}
                          aria-label="Confirmar SKU"
                          className="p-1 rounded text-emerald-400 hover:bg-emerald-500/20"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditSku}
                          aria-label="Cancelar edición"
                          className="p-1 rounded text-muted-foreground hover:bg-muted"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 group">
                        <span>{p.sku}</span>
                        <button
                          type="button"
                          onClick={() => startEditSku(p)}
                          title="Edición rápida de código SKU"
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-primary transition-opacity"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>

                  <td className="py-2 px-3 font-sans text-foreground font-medium max-w-xs truncate" title={p.name}>
                    {p.name}
                  </td>
                  <td className="py-2 px-3 text-[10px] uppercase">{p.unitOfMeasure}</td>
                  <td className="py-2 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted/60 text-foreground border border-card-border">
                      {p.vatRate === 'IVA_10' ? '10%' : p.vatRate === 'IVA_5' ? '5%' : 'Exento'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right">{formatCurrencyPYG(Number(p.costPrice))}</td>
                  <td className="py-2 px-3 text-right font-bold text-foreground">
                    {formatCurrencyPYG(Number(p.salePrice))}
                  </td>
                  <td className="py-2 px-3 text-right font-bold">
                    <span className={isCritical ? 'text-danger' : isLow ? 'text-warning' : 'text-emerald-400'}>
                      {currentStock}
                    </span>
                  </td>

                  {/* Estado Alineado a la Derecha */}
                  <td className="py-2 px-3 text-right">
                    <div className="flex justify-end">
                      {isCritical ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-danger bg-danger/10 px-2 py-0.5 rounded border border-danger/20 font-bold">
                          <AlertCircle className="w-3 h-3" /> Sin Stock
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-warning bg-warning/10 px-2 py-0.5 rounded border border-warning/20 font-bold">
                          <AlertCircle className="w-3 h-3" /> Bajo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Normal
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Acciones: Editar, Kardex, Eliminar */}
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* Editar Completo */}
                      <button
                        type="button"
                        onClick={() => onEditProduct(p)}
                        title="Editar datos completos del producto"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#0d121c] border border-card-border hover:border-primary text-muted-foreground hover:text-primary transition-colors text-[11px]"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Editar</span>
                      </button>

                      {/* Kardex */}
                      <button
                        type="button"
                        onClick={() => onOpenKardex(p)}
                        title="Registrar movimiento en Kardex"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#0d121c] border border-card-border hover:border-primary text-muted-foreground hover:text-primary transition-colors text-[11px]"
                      >
                        <Layers className="w-3 h-3" />
                        <span>Kardex</span>
                      </button>

                      {/* Eliminar */}
                      <button
                        type="button"
                        onClick={() => onDeleteProduct(p)}
                        title="Eliminar producto"
                        className="inline-flex items-center gap-1 px-1.5 py-1 rounded bg-[#0d121c] border border-card-border hover:border-danger text-muted-foreground hover:text-danger transition-colors text-[11px]"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="bg-[#0d121c] px-4 py-2 border-t border-card-border flex items-center justify-between text-xs text-muted-foreground">
        <span>Página <strong className="text-foreground">{currentPage}</strong> de <strong className="text-foreground">{totalPages || 1}</strong></span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Página anterior"
            className="p-1 rounded bg-card border border-card-border disabled:opacity-40 hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Página siguiente"
            className="p-1 rounded bg-card border border-card-border disabled:opacity-40 hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

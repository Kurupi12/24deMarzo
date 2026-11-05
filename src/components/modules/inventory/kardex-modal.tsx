'use client';

import React, { useState, useEffect } from 'react';
import { X, Layers, PlusCircle, MinusCircle, History } from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';

interface KardexModalProps {
  product: { id: string; name: string; sku: string; costPrice: string | number } | null;
  isOpen: boolean;
  onClose: () => void;
  onMovementCreated: () => void;
}

const MOVEMENT_LABELS: Record<string, { label: string; isPositive: boolean }> = {
  INITIAL_STOCK: { label: 'Inventario Inicial', isPositive: true },
  IN_PURCHASE: { label: 'Entrada por Compra', isPositive: true },
  OUT_SALE: { label: 'Salida por Venta', isPositive: false },
  TRANSFER_IN: { label: 'Traslado Entrada', isPositive: true },
  TRANSFER_OUT: { label: 'Traslado Salida', isPositive: false },
  ADJUSTMENT_POSITIVE: { label: 'Ajuste Positivo (+)', isPositive: true },
  ADJUSTMENT_NEGATIVE: { label: 'Ajuste Negativo (Merma/Rotura)', isPositive: false },
};

export function KardexModal({ product, isOpen, onClose, onMovementCreated }: KardexModalProps) {
  const [movementType, setMovementType] = useState('ADJUSTMENT_POSITIVE');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (product && isOpen) {
      fetch(`/api/v1/inventory/movements?productId=${product.id}`)
        .then((res) => res.json())
        .then((json) => { if (json.success) setHistory(json.data); });
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) return;

    setLoading(true);
    try {
      const res = await fetch('/api/v1/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          movementType,
          quantity: qty,
          unitCost: Number(product.costPrice) || 0,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQuantity('');
        setNotes('');
        onMovementCreated();
        onClose();
      } else {
        alert(data.error?.message || 'Error al registrar movimiento');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-card border border-card-border rounded-lg w-full max-w-lg p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-card-border pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Registro en Kardex: {product.sku}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground font-sans">{product.name}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-mono text-muted-foreground mb-1">Tipo de Movimiento</label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="IN_PURCHASE">Entrada por Compra</option>
              <option value="ADJUSTMENT_POSITIVE">Ajuste Positivo (Sobrante)</option>
              <option value="ADJUSTMENT_NEGATIVE">Ajuste Negativo (Merma / Rotura)</option>
              <option value="OUT_SALE">Salida Manual por Venta</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Cantidad</label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ej: 5"
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Costo Estimado Unitario</label>
              <input
                type="text"
                disabled
                value={formatCurrencyPYG(Number(product.costPrice))}
                className="w-full bg-[#0d121c]/50 border border-card-border rounded-md px-3 py-1.5 text-xs text-muted-foreground font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-muted-foreground mb-1">Observación / Justificación</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Conteo físico quincenal..."
              className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-card-border">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md border border-card-border text-xs text-muted-foreground hover:text-foreground">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-3 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-medium disabled:opacity-50">
              {loading ? 'Guardando...' : 'Asentar en Kardex'}
            </button>
          </div>
        </form>

        {/* Historial rápido */}
        <div className="pt-2 border-t border-card-border">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground mb-2">
            <History className="w-3.5 h-3.5" />
            <span>Últimos Asientos de Kardex ({history.length})</span>
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1.5 font-mono text-[10px]">
            {history.slice(0, 6).map((h) => {
              const info = MOVEMENT_LABELS[h.movementType] || { label: h.movementType, isPositive: true };
              return (
                <div key={h.id} className="p-2 rounded bg-[#0d121c] border border-card-border/60 flex items-center justify-between">
                  <div>
                    <span className={`font-semibold ${info.isPositive ? 'text-emerald-400' : 'text-danger'}`}>
                      {info.label}
                    </span>
                    <span className="text-muted-foreground ml-2">({info.isPositive ? '+' : '-'}{h.quantity} unid.)</span>
                    {h.notes && <p className="text-[9px] text-muted-foreground font-sans mt-0.5 truncate max-w-[260px]">{h.notes}</p>}
                  </div>
                  <div className="text-right">
                    <span className="text-foreground font-bold block">Saldo: {h.newStock} unid.</span>
                    <span className="text-[9px] text-muted-foreground">{new Date(h.createdAt).toLocaleDateString('es-PY')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


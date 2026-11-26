'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, PackagePlus, Sparkles } from 'lucide-react';
import { useCustomDialog } from '@/components/common/custom-dialog-provider';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (product?: any) => void;
  initialName?: string;
}

export function CreateProductModal({
  isOpen,
  onClose,
  onProductCreated,
  initialName = '',
}: CreateProductModalProps) {
  const { alert: customAlert } = useCustomDialog();
  const [form, setForm] = useState({
    sku: '',
    barcode: '',
    name: '',
    unitOfMeasure: 'UNIDAD',
    vatRate: 'IVA_10',
    costPrice: '',
    salePrice: '',
    minStockAlert: '5',
  });
  const [loading, setLoading] = useState(false);
  const [generatingSku, setGeneratingSku] = useState(false);

  const fetchNextSku = async (name: string) => {
    try {
      setGeneratingSku(true);
      const res = await fetch(`/api/v1/inventory/products/next-sku?name=${encodeURIComponent(name.trim())}`);
      const data = await res.json();
      if (data.success && data.data?.sku) {
        setForm((prev) => ({ ...prev, sku: data.data.sku }));
      }
    } catch (err) {
      console.error('Error al generar SKU:', err);
    } finally {
      setGeneratingSku(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const cleanInitName = initialName.trim();
    setForm({
      sku: '',
      barcode: '',
      name: cleanInitName,
      unitOfMeasure: 'UNIDAD',
      vatRate: 'IVA_10',
      costPrice: '',
      salePrice: '',
      minStockAlert: '5',
    });
    if (cleanInitName) {
      fetchNextSku(cleanInitName);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/v1/inventory/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: form.sku.trim(),
          barcode: form.barcode.trim() || null,
          name: form.name.trim(),
          unitOfMeasure: form.unitOfMeasure,
          vatRate: form.vatRate,
          costPrice: parseFloat(form.costPrice) || 0,
          salePrice: parseFloat(form.salePrice) || 0,
          minStockAlert: parseFloat(form.minStockAlert) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onProductCreated(data.data);
        onClose();
      } else {
        customAlert({
          title: 'Error de Catálogo',
          message: data.error?.message || 'Error al crear producto',
          variant: 'danger',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-card border border-card-border rounded-lg w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-card-border pb-3">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Alta de Nuevo Producto (SIFEN / DNIT)</h3>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 font-sans text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono text-muted-foreground">SKU / Código Interno *</label>
                <button
                  type="button"
                  disabled={generatingSku}
                  onClick={() => fetchNextSku(form.name)}
                  className="flex items-center gap-1 text-[10px] text-primary hover:underline font-mono disabled:opacity-50"
                  title="Generar código correlativo según regla de letra y abecedario"
                >
                  <Sparkles className={`w-3 h-3 text-primary ${generatingSku ? 'animate-spin' : ''}`} />
                  {generatingSku ? 'Generando...' : 'Auto-generar'}
                </button>
              </div>
              <input
                type="text"
                required
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="Ej: C383, A166, L1298 (se autogenera)"
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Código de Barras (GTIN/EAN)</label>
              <input
                type="text"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder="Ej: 7840001234567"
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-muted-foreground mb-1">Descripción / Nombre Oficial *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onBlur={() => {
                if (!form.sku.trim() && form.name.trim().length > 0) {
                  fetchNextSku(form.name);
                }
              }}
              placeholder="Ej: Cemento Yguazú 50kg, Arena Lavada..."
              className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Unidad Oficial DNIT</label>
              <select
                value={form.unitOfMeasure}
                onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })}
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:border-primary"
              >
                <option value="UNIDAD">UNIDAD (77)</option>
                <option value="KILOGRAMO">KILOGRAMO (83)</option>
                <option value="GRAMO">GRAMO (84)</option>
                <option value="METRO">METRO (87)</option>
                <option value="LITRO">LITRO (88)</option>
                <option value="CAJA">CAJA (78)</option>
                <option value="PAQUETE">PAQUETE (80)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Régimen IVA</label>
              <select
                value={form.vatRate}
                onChange={(e) => setForm({ ...form, vatRate: e.target.value })}
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:border-primary"
              >
                <option value="IVA_10">IVA 10% (General)</option>
                <option value="IVA_5">IVA 5% (Canasta Básica)</option>
                <option value="EXEMPT">Exento de IVA</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Costo Unit. (₲)</label>
              <input
                type="number"
                min="0"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                onFocus={(e) => e.target.select()}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                placeholder="0"
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Precio Venta (₲) *</label>
              <input
                type="number"
                min="0"
                required
                value={form.salePrice}
                onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                onFocus={(e) => e.target.select()}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                placeholder="0"
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Stock Mínimo</label>
              <input
                type="number"
                min="0"
                value={form.minStockAlert}
                onChange={(e) => setForm({ ...form, minStockAlert: e.target.value })}
                onFocus={(e) => e.target.select()}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                placeholder="5"
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-card-border">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md border border-card-border text-xs text-muted-foreground hover:text-foreground">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-3 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-medium disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


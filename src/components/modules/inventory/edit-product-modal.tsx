'use client';

import React, { useState, useEffect } from 'react';
import { X, Pencil, Save, AlertCircle } from 'lucide-react';

interface EditProductModalProps {
  product: any | null;
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated: () => void;
}

export function EditProductModal({
  product,
  isOpen,
  onClose,
  onProductUpdated,
}: EditProductModalProps) {
  const [form, setForm] = useState({
    sku: '',
    barcode: '',
    name: '',
    description: '',
    unitOfMeasure: 'UNIDAD',
    vatRate: 'IVA_10',
    costPrice: '0',
    salePrice: '0',
    minStockAlert: '0',
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setForm({
        sku: product.sku || '',
        barcode: product.barcode || '',
        name: product.name || '',
        description: product.description || '',
        unitOfMeasure: product.unitOfMeasure || 'UNIDAD',
        vatRate: product.vatRate || 'IVA_10',
        costPrice: String(product.costPrice ?? 0),
        salePrice: String(product.salePrice ?? 0),
        minStockAlert: String(product.minStockAlert ?? 0),
      });
      setErrorMsg(null);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/inventory/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          sku: form.sku.trim(),
          barcode: form.barcode.trim() || null,
          name: form.name.trim(),
          description: form.description.trim() || null,
          unitOfMeasure: form.unitOfMeasure,
          vatRate: form.vatRate,
          costPrice: parseFloat(form.costPrice) || 0,
          salePrice: parseFloat(form.salePrice) || 0,
          minStockAlert: parseFloat(form.minStockAlert) || 0,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onProductUpdated();
        onClose();
      } else {
        setErrorMsg(data.error?.message || 'Error al actualizar el producto');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-card border border-card-border rounded-lg w-full max-w-xl p-5 space-y-4 shadow-xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-card-border pb-3">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Editar Producto Completo</h3>
              <p className="text-[11px] text-muted-foreground font-mono">ID: {product.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-2.5 rounded bg-danger/10 border border-danger/20 text-danger text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 font-sans text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">SKU / Código Interno *</label>
              <input
                type="text"
                required
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Código de Barras (GTIN/EAN)</label>
              <input
                type="text"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder="Opcional"
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
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-card-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border border-card-border text-xs text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-medium disabled:opacity-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


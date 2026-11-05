'use client';

import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';

interface DeleteProductModalProps {
  product: any | null;
  isOpen: boolean;
  onClose: () => void;
  onProductDeleted: () => void;
}

export function DeleteProductModal({
  product,
  isOpen,
  onClose,
  onProductDeleted,
}: DeleteProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const handleDelete = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/inventory/products?id=${product.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        onProductDeleted();
        onClose();
      } else {
        setErrorMsg(data.error?.message || 'Error al eliminar el producto');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-card border border-card-border rounded-lg w-full max-w-md p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-card-border pb-3">
          <div className="flex items-center gap-2 text-danger">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 className="text-sm font-bold text-foreground">Confirmar Eliminación</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded bg-danger/10 border border-danger/20 text-danger text-xs">
            {errorMsg}
          </div>
        )}

        <div className="space-y-3 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            ¿Está seguro de que desea eliminar el siguiente producto del catálogo maestro?
          </p>

          <div className="bg-[#0d121c] border border-card-border rounded-md p-3 space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">SKU:</span>
              <span className="text-foreground font-bold">{product.sku}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Descripción:</span>
              <span className="text-foreground font-sans text-right max-w-[240px] truncate" title={product.name}>
                {product.name}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-md bg-warning/10 border border-warning/20 flex items-start gap-2 text-[11px] text-warning leading-normal">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Si el producto cuenta con comprobantes o ventas históricas, el sistema aplicará una baja lógica (archivado) para proteger la validez legal y fiscal ante el SIFEN / DNIT.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-card-border">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-3 py-1.5 rounded-md border border-card-border text-xs text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-danger hover:bg-danger/80 text-white text-xs font-medium disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{loading ? 'Eliminando...' : 'Sí, Eliminar Producto'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}


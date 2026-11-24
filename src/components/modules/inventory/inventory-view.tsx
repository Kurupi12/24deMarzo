'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ProductFilters } from './product-filters';
import { ProductsTable } from './products-table';
import { KardexModal } from './kardex-modal';
import { CreateProductModal } from './create-product-modal';
import { EditProductModal } from './edit-product-modal';
import { DeleteProductModal } from './delete-product-modal';
import { StockCountModal, StockCountProductItem } from './stock-count-modal';
import { Boxes, Plus, ClipboardCheck, Printer, X } from 'lucide-react';

export function InventoryView() {
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [search, setSearch] = useState('');
  const [vatRate, setVatRate] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modales
  const [selectedProductForKardex, setSelectedProductForKardex] = useState<any>(null);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<any>(null);
  const [selectedProductForDelete, setSelectedProductForDelete] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Selección persistente entre búsquedas para hoja de Control de Stock Físico
  const [selectedForCount, setSelectedForCount] = useState<Record<string, StockCountProductItem>>({});
  const [isStockCountModalOpen, setIsStockCountModalOpen] = useState(false);

  const selectedProductIds = useMemo(() => new Set(Object.keys(selectedForCount)), [selectedForCount]);
  const selectedCountItems = useMemo(() => Object.values(selectedForCount), [selectedForCount]);

  const mapToCountItem = (p: any): StockCountProductItem => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    unitOfMeasure: p.unitOfMeasure || 'UNIDAD',
    currentStock: Number(p.stockItems?.[0]?.currentStock ?? 0),
  });

  const handleToggleProductSelect = (p: any) => {
    setSelectedForCount((prev) => {
      const next = { ...prev };
      if (next[p.id]) {
        delete next[p.id];
      } else {
        next[p.id] = mapToCountItem(p);
      }
      return next;
    });
  };

  const handleToggleAllVisible = (visibleProducts: any[], selectAll: boolean) => {
    setSelectedForCount((prev) => {
      const next = { ...prev };
      for (const p of visibleProducts) {
        if (selectAll) {
          next[p.id] = mapToCountItem(p);
        } else {
          delete next[p.id];
        }
      }
      return next;
    });
  };

  const handleRemoveFromCount = (id: string) => {
    setSelectedForCount((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search.trim()) params.append('search', search.trim());
      if (vatRate) params.append('vatRate', vatRate);

      const res = await fetch(`/api/v1/inventory/products?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        let items = json.data || [];
        if (onlyLowStock) {
          items = items.filter((p: any) => {
            const stock = Number(p.stockItems?.[0]?.currentStock ?? 0);
            const min = Number(p.minStockAlert ?? 0);
            return stock <= min;
          });
        }
        setProducts(items);
        setTotal(onlyLowStock ? items.length : json.metadata?.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, vatRate, onlyLowStock]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <div id="inventory-main-ui" className="space-y-4">
        {/* Barra de cabecera con botón de acción rápida */}
        <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Catálogo Maestro & Control de Inventario
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestión completa de 653 productos de ferretería en Neon Postgres con edición, bajas y Kardex multi-depósito.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-medium transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* Filtros */}
      <ProductFilters
        search={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        vatRate={vatRate}
        onVatRateChange={(val) => { setVatRate(val); setPage(1); }}
        onlyLowStock={onlyLowStock}
        onOnlyLowStockToggle={() => { setOnlyLowStock(!onlyLowStock); setPage(1); }}
        onRefresh={fetchProducts}
        loading={loading}
        totalProducts={total}
      />

      {/* Barra de Selección Persistente para Control de Stock Físico */}
      {selectedCountItems.length > 0 && (
        <div className="bg-primary/10 border border-primary/35 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="space-y-1.5 flex-1 min-w-[260px]">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <ClipboardCheck className="w-4 h-4 text-primary shrink-0" />
              <span>
                Control de Stock Físico: {selectedCountItems.length}{' '}
                {selectedCountItems.length === 1 ? 'producto seleccionado' : 'productos seleccionados'}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground font-normal">
                (podés seguir buscando y agregando más sin perder los anteriores)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {selectedCountItems.slice(0, 6).map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-card border border-card-border text-[10px] font-mono text-foreground"
                >
                  <span className="max-w-[160px] truncate">{item.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFromCount(item.id)}
                    className="text-muted-foreground hover:text-red-400"
                    title="Quitar de la lista"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {selectedCountItems.length > 6 && (
                <span className="text-[10px] font-mono text-primary font-semibold px-1">
                  +{selectedCountItems.length - 6} más...
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedForCount({})}
              className="px-2.5 py-1.5 rounded-md border border-card-border bg-card hover:bg-muted/20 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => setIsStockCountModalOpen(true)}
              className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF Planilla ({selectedCountItems.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabla de Productos con Edición y Eliminación */}
      <ProductsTable
        products={products}
        loading={loading}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onOpenKardex={setSelectedProductForKardex}
        onEditProduct={setSelectedProductForEdit}
        onDeleteProduct={setSelectedProductForDelete}
        onSkuUpdated={fetchProducts}
        selectedProductIds={selectedProductIds}
        onToggleProductSelect={handleToggleProductSelect}
        onToggleAllVisible={handleToggleAllVisible}
      />

      {/* Modal de Kardex */}
      <KardexModal
        product={selectedProductForKardex}
        isOpen={!!selectedProductForKardex}
        onClose={() => setSelectedProductForKardex(null)}
        onMovementCreated={fetchProducts}
      />

      {/* Modal de Creación */}
      <CreateProductModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProductCreated={fetchProducts}
      />

      {/* Modal de Edición Completa */}
      <EditProductModal
        product={selectedProductForEdit}
        isOpen={!!selectedProductForEdit}
        onClose={() => setSelectedProductForEdit(null)}
        onProductUpdated={fetchProducts}
      />

      {/* Modal de Confirmación de Eliminación */}
      <DeleteProductModal
        product={selectedProductForDelete}
        isOpen={!!selectedProductForDelete}
        onClose={() => setSelectedProductForDelete(null)}
        onProductDeleted={fetchProducts}
      />
      </div>

      {/* Modal de Hoja Imprimible de Control de Stock Físico */}
      <StockCountModal
        isOpen={isStockCountModalOpen}
        items={selectedCountItems}
        onClose={() => setIsStockCountModalOpen(false)}
        onRemoveItem={handleRemoveFromCount}
        onClearAll={() => setSelectedForCount({})}
      />
    </>
  );
}

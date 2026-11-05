'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProductFilters } from './product-filters';
import { ProductsTable } from './products-table';
import { KardexModal } from './kardex-modal';
import { CreateProductModal } from './create-product-modal';
import { EditProductModal } from './edit-product-modal';
import { DeleteProductModal } from './delete-product-modal';
import { Boxes, Plus } from 'lucide-react';

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
    <div className="space-y-4">
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
  );
}

'use client';

import React from 'react';
import { Search, Filter, AlertTriangle, RotateCw } from 'lucide-react';

interface ProductFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  vatRate: string;
  onVatRateChange: (value: string) => void;
  onlyLowStock: boolean;
  onOnlyLowStockToggle: () => void;
  onRefresh: () => void;
  loading: boolean;
  totalProducts: number;
}

export function ProductFilters({
  search,
  onSearchChange,
  vatRate,
  onVatRateChange,
  onlyLowStock,
  onOnlyLowStockToggle,
  onRefresh,
  loading,
  totalProducts,
}: ProductFiltersProps) {
  return (
    <div className="bg-card border border-card-border rounded-lg p-3.5 space-y-3">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Input Buscador */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por SKU, código de barras o nombre de producto..."
            className="w-full bg-[#0d121c] border border-card-border rounded-md pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Filtro de IVA */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#0d121c] border border-card-border rounded-md text-xs">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={vatRate}
              onChange={(e) => onVatRateChange(e.target.value)}
              className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-card">Todos los IVAs</option>
              <option value="IVA_10" className="bg-card">IVA 10% (General)</option>
              <option value="IVA_5" className="bg-card">IVA 5% (Reducido)</option>
              <option value="EXEMPT" className="bg-card">Exento</option>
            </select>
          </div>

          {/* Toggle Stock Crítico */}
          <button
            type="button"
            onClick={onOnlyLowStockToggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              onlyLowStock
                ? 'bg-warning/15 text-warning border-warning/30 font-semibold'
                : 'bg-[#0d121c] text-muted-foreground border-card-border hover:text-foreground'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Stock Crítico</span>
          </button>

          {/* Botón Refrescar */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Actualizar catálogo"
            className="p-1.5 rounded-md bg-[#0d121c] border border-card-border text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-card-border/60">
        <span className="font-mono">
          Registros en vista: <strong className="text-foreground">{totalProducts}</strong> productos
        </span>
        <span className="text-[10px]">
          Soporte para lector de código de barras USB/Bluetooth activo
        </span>
      </div>
    </div>
  );
}


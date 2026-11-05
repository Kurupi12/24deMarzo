'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Receipt,
  Trash2,
  Calendar,
  Building2,
  Boxes,
  CheckCircle2,
  Clock,
  Eye,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function PurchasesView() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);

  // Estados del Formulario de Nueva Compra
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierRuc, setSupplierRuc] = useState('');
  const [paymentCondition, setPaymentCondition] = useState('CONTADO');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<any[]>([]);

  // Buscador de productos para compra
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);
  const [savingPurchase, setSavingPurchase] = useState(false);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/inventory/purchases?search=${encodeURIComponent(searchQuery)}`);
      const json = await res.json();
      if (json.success) {
        setPurchases(json.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [searchQuery]);

  // Buscar productos mientras tipea
  useEffect(() => {
    if (productSearch.trim().length >= 2) {
      fetch(`/api/v1/inventory/products?search=${encodeURIComponent(productSearch.trim())}&limit=5`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setProductResults(json.data || []);
        });
    } else {
      setProductResults([]);
    }
  }, [productSearch]);

  const addProductToPurchase = (prod: any) => {
    const existing = items.find((i) => i.productId === prod.id);
    if (existing) {
      setItems(
        items.map((i) =>
          i.productId === prod.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setItems([
        ...items,
        {
          productId: prod.id,
          name: prod.name,
          sku: prod.sku,
          unitMeasure: prod.unitOfMeasure,
          quantity: 1,
          unitCost: Number(prod.costPrice) || 0,
          vatRate: prod.vatRate || 'IVA_10',
        },
      ]);
    }
    setProductSearch('');
    setProductResults([]);
  };

  const updateItemQty = (prodId: string, qty: number) => {
    if (qty <= 0) return removeItem(prodId);
    setItems(items.map((i) => (i.productId === prodId ? { ...i, quantity: qty } : i)));
  };

  const updateItemCost = (prodId: string, cost: number) => {
    setItems(items.map((i) => (i.productId === prodId ? { ...i, unitCost: cost } : i)));
  };

  const removeItem = (prodId: string) => {
    setItems(items.filter((i) => i.productId !== prodId));
  };

  const grandTotal = items.reduce((acc, i) => acc + i.quantity * i.unitCost, 0);
  const totalVat = Math.round(grandTotal / 11);

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Debe agregar al menos un material o producto a la factura de compra.');
      return;
    }
    setSavingPurchase(true);
    try {
      const res = await fetch('/api/v1/inventory/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: invoiceNumber.trim(),
          supplierName: supplierName.trim(),
          supplierRuc: supplierRuc.trim(),
          paymentCondition,
          notes: notes.trim(),
          items,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setInvoiceNumber('');
        setSupplierName('');
        setSupplierRuc('');
        setItems([]);
        setNotes('');
        fetchPurchases();
      } else {
        alert(data.error?.message || 'Error al procesar la compra');
      }
    } finally {
      setSavingPurchase(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera del Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-card-border p-5 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
              Gestión de Compras a Proveedores & Entradas al Depósito
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Registro oficial de facturas de proveedores con actualización automática de inventario físico y Kardex en tiempo real.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Factura de Compra</span>
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-card border border-card-border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar compra por N° factura de proveedor, razón social o RUC..."
            className="w-full bg-[#0d121c] border border-card-border rounded-lg pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono"
          />
        </div>
        <div className="text-xs font-mono text-muted-foreground whitespace-nowrap">
          Facturas registradas: <strong className="text-foreground">{purchases.length}</strong>
        </div>
      </div>

      {/* Tabla de Facturas de Compra */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-mono">
            Consultando compras y entradas a depósito en Neon Postgres...
          </div>
        ) : purchases.length === 0 ? (
          <div className="p-16 text-center text-xs text-muted-foreground">
            <Truck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-foreground font-medium">No hay compras registradas aún.</p>
            <p className="text-[11px] text-muted-foreground mt-1">Haga clic en &quot;Registrar Factura de Compra&quot; para ingresar mercadería al stock.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0d121c] border-b border-card-border text-[11px] font-mono uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Comprobante Interno</th>
                  <th className="py-3 px-4">Factura Proveedor</th>
                  <th className="py-3 px-4">Proveedor / RUC</th>
                  <th className="py-3 px-4">Fecha de Entrada</th>
                  <th className="py-3 px-4">Condición</th>
                  <th className="py-3 px-4 text-right">Ítems</th>
                  <th className="py-3 px-4 text-right">Monto Total</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border font-mono text-muted-foreground">
                {purchases.map((p) => {
                  const dateStr = format(new Date(p.purchaseDate), "dd/MM/yyyy HH:mm", { locale: es });
                  return (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-bold text-foreground">{p.purchaseNumber}</td>
                      <td className="py-3 px-4 text-accent font-bold">{p.invoiceNumber}</td>
                      <td className="py-3 px-4 font-sans">
                        <p className="font-semibold text-foreground truncate max-w-xs">{p.supplierName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{p.supplierRuc}</p>
                      </td>
                      <td className="py-3 px-4 text-[11px]">{dateStr}</td>
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-card border border-card-border text-foreground">
                          {p.paymentCondition}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">{p.items.length} SKUs</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400 font-mono">
                        {formatCurrencyPYG(Number(p.grandTotal))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedPurchase(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0d121c] border border-card-border hover:border-primary text-muted-foreground hover:text-primary transition-colors text-[11px]"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Ver Detalle</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Registrar Nueva Factura de Compra */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-card-border rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-5 py-4 border-b border-card-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Registrar Factura de Compra de Proveedor</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Datos de Cabecera */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg bg-[#0d121c] border border-card-border">
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">N° Factura Proveedor *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 001-002-0045612"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full bg-card border border-card-border rounded-md px-2.5 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">RUC del Proveedor *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 80012345-6"
                    value={supplierRuc}
                    onChange={(e) => setSupplierRuc(e.target.value)}
                    className="w-full bg-card border border-card-border rounded-md px-2.5 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">Razón Social *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Industria Nacional del Cemento"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full bg-card border border-card-border rounded-md px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              {/* Selector de Materiales a Cargar */}
              <div className="space-y-2">
                <label className="block text-[11px] font-mono text-primary font-semibold">
                  Buscar Material / Producto para Ingreso de Stock:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Buscar por código de barras o nombre de artículo..."
                    className="w-full bg-[#0d121c] border border-card-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                  {productResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-card-border rounded-lg shadow-2xl z-30 max-h-48 overflow-y-auto divide-y divide-card-border">
                      {productResults.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => addProductToPurchase(p)}
                          className="p-2 hover:bg-muted/30 cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-foreground mr-2">{p.sku}</span>
                            <span className="text-foreground">{p.name}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Últ. Costo: {formatCurrencyPYG(Number(p.costPrice))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tabla de Artículos en la Factura de Compra */}
              <div className="border border-card-border rounded-lg overflow-hidden bg-[#0d121c]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-card-border text-[10px] font-mono uppercase text-muted-foreground bg-card">
                    <tr>
                      <th className="py-2 px-3">Artículo</th>
                      <th className="py-2 px-3 text-center w-20">Cantidad</th>
                      <th className="py-2 px-3 text-right w-36">Costo Unit. (Gs)</th>
                      <th className="py-2 px-3 text-right w-32">Subtotal</th>
                      <th className="py-2 px-3 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border font-mono">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground text-xs font-sans">
                          No se han seleccionado productos aún. Busque y seleccione arriba.
                        </td>
                      </tr>
                    ) : (
                      items.map((it) => (
                        <tr key={it.productId} className="hover:bg-muted/10">
                          <td className="py-2 px-3">
                            <span className="font-bold text-foreground block font-sans truncate max-w-xs">{it.name}</span>
                            <span className="text-[10px] text-muted-foreground">{it.sku}</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) => updateItemQty(it.productId, parseInt(e.target.value) || 1)}
                              className="w-16 bg-card border border-card-border rounded px-1.5 py-0.5 text-center text-foreground font-mono text-xs"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={it.unitCost}
                              onChange={(e) => updateItemCost(it.productId, parseInt(e.target.value) || 0)}
                              className="w-28 bg-card border border-card-border rounded px-1.5 py-0.5 text-right text-foreground font-mono text-xs"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-foreground">
                            {formatCurrencyPYG(it.quantity * it.unitCost)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(it.productId)}
                              className="text-muted-foreground hover:text-danger p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totales y Liquidación */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">Notas / Observaciones de la Entrada</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: Camión descargado en nave 2, lote n° 4412"
                    className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground text-xs"
                  />
                </div>
                <div className="p-3 rounded-lg bg-[#0d121c] border border-card-border font-mono space-y-1">
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>IVA 10% (Crédito Fiscal):</span>
                    <span>{formatCurrencyPYG(totalVat)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-foreground pt-1 border-t border-card-border">
                    <span>Total Factura Compra:</span>
                    <span className="text-emerald-400">{formatCurrencyPYG(grandTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-md border border-card-border text-muted-foreground hover:bg-muted/20"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPurchase || items.length === 0}
                  className="px-5 py-2 rounded-md bg-primary hover:bg-primary-hover text-white font-semibold flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingPurchase ? 'Ingresando a Stock...' : 'Confirmar e Ingresar al Kardex'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ver Detalle de Factura de Compra */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-card-border rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">Comprobante de Entrada #{selectedPurchase.purchaseNumber}</h3>
                  <p className="text-[11px] font-mono text-muted-foreground">Factura: {selectedPurchase.invoiceNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPurchase(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-[#0d121c] p-3 rounded-lg border border-card-border">
              <div>
                <p className="text-[10px] uppercase font-mono text-muted-foreground">Proveedor</p>
                <p className="font-bold text-foreground">{selectedPurchase.supplierName}</p>
                <p className="text-muted-foreground font-mono">RUC: {selectedPurchase.supplierRuc}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-mono text-muted-foreground">Fecha & Condición</p>
                <p className="font-mono text-foreground">{format(new Date(selectedPurchase.purchaseDate), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                <p className="text-muted-foreground font-mono">{selectedPurchase.paymentCondition}</p>
              </div>
            </div>

            <div className="border border-card-border rounded-lg overflow-hidden text-xs max-h-60 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-[#0d121c] text-[10px] font-mono uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 px-3">Cant.</th>
                    <th className="py-2 px-3">Artículo</th>
                    <th className="py-2 px-3 text-right">Costo Unit.</th>
                    <th className="py-2 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border font-mono">
                  {selectedPurchase.items?.map((it: any) => (
                    <tr key={it.id}>
                      <td className="py-2 px-3">{it.quantity}</td>
                      <td className="py-2 px-3 font-sans">{it.product?.name || 'Artículo'}</td>
                      <td className="py-2 px-3 text-right">{formatCurrencyPYG(Number(it.unitCost))}</td>
                      <td className="py-2 px-3 text-right font-bold text-foreground">{formatCurrencyPYG(Number(it.subtotal))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 rounded-lg bg-[#0d121c] border border-card-border font-mono flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Monto Total Facturado:</span>
              <span className="text-base font-bold text-emerald-400">{formatCurrencyPYG(Number(selectedPurchase.grandTotal))}</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedPurchase(null)}
                className="px-4 py-1.5 rounded-md bg-card border border-card-border hover:bg-muted/20 text-xs text-foreground"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


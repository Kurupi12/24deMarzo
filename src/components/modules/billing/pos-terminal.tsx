'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, ReceiptText, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { calculateVatBreakdown } from '@/shared/utils/vat-calculator';
import { validateParaguayRuc } from '@/shared/utils/ruc-validator';

export function PosTerminal({ onSaleCompleted }: { onSaleCompleted: () => void }) {
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState('Sin Nombre (Consumidor Final)');
  const [customerRuc, setCustomerRuc] = useState('44444401-7');
  const [paymentCondition, setPaymentCondition] = useState('CONTADO');
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [loading, setLoading] = useState(false);

  // Buscar productos mientras escribe
  useEffect(() => {
    if (productSearch.trim().length >= 2) {
      fetch(`/api/v1/inventory/products?search=${encodeURIComponent(productSearch.trim())}&limit=5`)
        .then((res) => res.json())
        .then((json) => { if (json.success) setSearchResults(json.data || []); });
    } else {
      setSearchResults([]);
    }
  }, [productSearch]);

  const addToCart = (product: any) => {
    const existing = cart.find((i) => i.productId === product.id);
    if (existing) {
      setCart(cart.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unitPrice: Number(product.salePrice),
        vatRate: product.vatRate,
        quantity: 1,
      }]);
    }
    setProductSearch('');
    setSearchResults([]);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((i) => i.productId !== productId));
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) return removeFromCart(productId);
    setCart(cart.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)));
  };

  // Desglose impositivo en tiempo real
  const breakdown = calculateVatBreakdown(
    cart.map((i) => ({ total: i.quantity * i.unitPrice, vatRate: i.vatRate }))
  );

  const rucValidation = validateParaguayRuc(customerRuc);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return alert('El carrito está vacío');
    setLoading(true);
    try {
      const res = await fetch('/api/v1/billing/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerRuc,
          paymentCondition,
          paymentMethod,
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            vatRate: i.vatRate,
          })),
          issueInvoiceImmediately: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCart([]);
        onSaleCompleted();
      } else {
        alert(data.error?.message || 'Error al emitir factura');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Columna Izquierda: Buscador y Carrito */}
      <div className="lg:col-span-7 space-y-4">
        {/* Buscador de artículos */}
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Buscar por código de barras o nombre de producto..."
            className="w-full bg-[#0d121c] border border-card-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-card-border rounded-lg shadow-xl z-20 max-h-56 overflow-y-auto divide-y divide-card-border">
              {searchResults.map((p) => (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="p-2.5 hover:bg-muted/30 cursor-pointer flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-foreground mr-2">{p.sku}</span>
                    <span className="text-foreground">{p.name}</span>
                  </div>
                  <span className="font-mono text-primary font-bold">{formatCurrencyPYG(Number(p.salePrice))}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lista del carrito */}
        <div className="bg-card border border-card-border rounded-lg p-4 min-h-[360px] flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-card-border text-[11px] font-mono text-muted-foreground uppercase">
              <span>Producto</span>
              <span>Subtotal</span>
            </div>
            {cart.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-12">Carrito vacío. Agregue productos arriba.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between p-2 rounded bg-[#0d121c] border border-card-border text-xs">
                    <div className="flex-1 pr-2 truncate">
                      <p className="font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{formatCurrencyPYG(item.unitPrice)} c/u</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                        className="w-12 bg-card border border-card-border rounded px-1.5 py-0.5 text-center font-mono text-foreground text-xs"
                      />
                      <span className="w-20 text-right font-mono font-bold text-foreground">
                        {formatCurrencyPYG(item.quantity * item.unitPrice)}
                      </span>
                      <button type="button" onClick={() => removeFromCart(item.productId)} className="text-muted-foreground hover:text-danger">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Columna Derecha: Datos Fiscales y Checkout */}
      <div className="lg:col-span-5 bg-card border border-card-border rounded-lg p-5 flex flex-col justify-between space-y-4">
        <form onSubmit={handleCheckout} className="space-y-3 font-sans text-xs flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase text-muted-foreground font-semibold flex items-center gap-1.5 pb-2 border-b border-card-border">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Datos del Cliente & SIFEN
            </h3>

            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Razón Social / Nombre *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-mono text-muted-foreground">RUC o CI con DV *</label>
                {rucValidation.isValid ? (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> RUC Válido
                  </span>
                ) : (
                  <span className="text-[10px] text-warning font-mono">Formato: XXXXXX-DV</span>
                )}
              </div>
              <input
                type="text"
                required
                value={customerRuc}
                onChange={(e) => setCustomerRuc(e.target.value)}
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">Condición</label>
                <select
                  value={paymentCondition}
                  onChange={(e) => setPaymentCondition(e.target.value)}
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-2 py-1.5 text-foreground"
                >
                  <option value="CONTADO">Contado</option>
                  <option value="CREDITO">Crédito</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">Método de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-2 py-1.5 text-foreground"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA_BANCARIA">Transferencia</option>
                  <option value="TARJETA_DEBITO">Débito</option>
                  <option value="TARJETA_CREDITO">Crédito</option>
                </select>
              </div>
            </div>
          </div>

          {/* Desglose impositivo fiscal */}
          <div className="p-3.5 rounded-lg bg-[#0d121c] border border-card-border font-mono text-xs space-y-1.5">
            <div className="flex justify-between text-muted-foreground text-[11px]">
              <span>Gravada IVA 10%:</span>
              <span>{formatCurrencyPYG(breakdown.taxable10)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground text-[11px]">
              <span>Liquidación IVA 10% (Base/11):</span>
              <span className="text-primary font-bold">{formatCurrencyPYG(breakdown.vat10Amount)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground text-[11px]">
              <span>Exentas / IVA 5%:</span>
              <span>{formatCurrencyPYG(breakdown.exempt + breakdown.taxable5)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-foreground pt-2 border-t border-card-border">
              <span>Total a Cobrar:</span>
              <span className="text-emerald-400">{formatCurrencyPYG(breakdown.grandTotal)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || cart.length === 0}
            className="w-full py-2.5 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-md"
          >
            <ReceiptText className="w-4 h-4" />
            <span>{loading ? 'Emitiendo DTE en DNIT...' : 'Emitir Factura Electrónica SIFEN'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}


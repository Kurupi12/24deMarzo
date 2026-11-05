'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Trash2,
  ReceiptText,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Truck,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
  X,
  PlusCircle,
} from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { calculateVatBreakdown } from '@/shared/utils/vat-calculator';
import { validateParaguayRuc } from '@/shared/utils/ruc-validator';

export function PosTerminal({ onSaleCompleted }: { onSaleCompleted: () => void }) {
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  
  // Cliente & Facturación
  const [customerName, setCustomerName] = useState('Sin Nombre (Consumidor Final)');
  const [customerRuc, setCustomerRuc] = useState('44444401-7');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentCondition, setPaymentCondition] = useState('CONTADO');
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');

  // Multi-obra por Cliente
  const [customerProjects, setCustomerProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectAddress, setNewProjectAddress] = useState('');
  const [newProjectContact, setNewProjectContact] = useState('');
  const [newProjectPhone, setNewProjectPhone] = useState('');
  const [savingProject, setSavingProject] = useState(false);

  // Logística y Despacho
  const [showDeliverySection, setShowDeliverySection] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [driverId, setDriverId] = useState<string>('');
  const [selectedHelperIds, setSelectedHelperIds] = useState<string[]>([]);
  const [vehiclePlate, setVehiclePlate] = useState<string>('Camión Reparto 4M (Central)');
  const [deliveryStatus, setDeliveryStatus] = useState<string>('DELIVERED');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');

  const [loading, setLoading] = useState(false);

  // Cargar Empleados (Choferes y Ayudantes)
  useEffect(() => {
    fetch('/api/v1/hr/employees')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setEmployees(json.data);
        }
      })
      .catch(() => {});
  }, []);

  // Cargar Obras del Cliente al cambiar RUC
  useEffect(() => {
    if (customerRuc && customerRuc.trim().length >= 4) {
      fetch(`/api/v1/billing/projects?customerRuc=${encodeURIComponent(customerRuc.trim())}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            setCustomerProjects(json.data || []);
            // Si el cliente tiene obras, no forzar, mantener o sugerir
          }
        })
        .catch(() => {});
    } else {
      setCustomerProjects([]);
      setSelectedProjectId('');
    }
  }, [customerRuc]);

  // Buscar productos mientras escribe
  useEffect(() => {
    if (productSearch.trim().length >= 2) {
      fetch(`/api/v1/inventory/products?search=${encodeURIComponent(productSearch.trim())}&limit=5`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setSearchResults(json.data || []);
        });
    } else {
      setSearchResults([]);
    }
  }, [productSearch]);

  const addToCart = (product: any) => {
    const existing = cart.find((i) => i.productId === product.id);
    if (existing) {
      setCart(cart.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unitPrice: Number(product.salePrice),
          vatRate: product.vatRate,
          quantity: 1,
        },
      ]);
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

  const toggleHelper = (id: string) => {
    if (selectedHelperIds.includes(id)) {
      setSelectedHelperIds(selectedHelperIds.filter((h) => h !== id));
    } else {
      setSelectedHelperIds([...selectedHelperIds, id]);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newProjectAddress.trim()) {
      alert('Nombre y Dirección de la obra son obligatorios');
      return;
    }
    setSavingProject(true);
    try {
      const res = await fetch('/api/v1/billing/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerRuc: customerRuc.trim(),
          name: newProjectName.trim(),
          address: newProjectAddress.trim(),
          contactName: newProjectContact.trim(),
          contactPhone: newProjectPhone.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCustomerProjects([data.data, ...customerProjects]);
        setSelectedProjectId(data.data.id);
        setShowNewProjectModal(false);
        setNewProjectName('');
        setNewProjectAddress('');
        setNewProjectContact('');
        setNewProjectPhone('');
      } else {
        alert(data.error?.message || 'Error al guardar la obra');
      }
    } finally {
      setSavingProject(false);
    }
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
          customerAddress: customerAddress || undefined,
          paymentCondition,
          paymentMethod,
          projectId: selectedProjectId || null,
          driverId: driverId || null,
          helperIds: selectedHelperIds,
          vehiclePlate: vehiclePlate || null,
          deliveryStatus,
          deliveryNotes: deliveryNotes || null,
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
        setSelectedProjectId('');
        setDeliveryNotes('');
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
            placeholder="Buscar por SKU o descripción (ej: Cemento, Varilla, Cal, Arena)..."
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
        <div className="bg-card border border-card-border rounded-lg p-4 min-h-[380px] flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-card-border text-[11px] font-mono text-muted-foreground uppercase">
              <span>Material / Producto</span>
              <span>Subtotal</span>
            </div>
            {cart.length === 0 ? (
              <div className="text-center py-16">
                <ReceiptText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Carrito vacío. Busque y agregue materiales arriba.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between p-2.5 rounded bg-[#0d121c] border border-card-border text-xs">
                    <div className="flex-1 pr-2 truncate">
                      <p className="font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{item.sku} &bull; {formatCurrencyPYG(item.unitPrice)} c/u</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                        className="w-14 bg-card border border-card-border rounded px-1.5 py-0.5 text-center font-mono text-foreground text-xs"
                      />
                      <span className="w-24 text-right font-mono font-bold text-foreground">
                        {formatCurrencyPYG(item.quantity * item.unitPrice)}
                      </span>
                      <button type="button" onClick={() => removeFromCart(item.productId)} className="text-muted-foreground hover:text-danger p-1">
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

      {/* Columna Derecha: Datos Fiscales, Obras y Logística */}
      <div className="lg:col-span-5 bg-card border border-card-border rounded-lg p-5 flex flex-col justify-between space-y-4">
        <form onSubmit={handleCheckout} className="space-y-3 font-sans text-xs flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Cabecera SIFEN */}
            <h3 className="text-xs font-mono uppercase text-muted-foreground font-semibold flex items-center justify-between pb-2 border-b border-card-border">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Datos del Cliente & SIFEN
              </span>
              <span className="text-[10px] font-mono text-emerald-400">DNIT En Línea</span>
            </h3>

            {/* RUC y Nombre */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-6">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-mono text-muted-foreground">RUC o CI con DV *</label>
                  {rucValidation.isValid ? (
                    <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Válido
                    </span>
                  ) : (
                    <span className="text-[9px] text-warning font-mono">XXXXXX-DV</span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={customerRuc}
                  onChange={(e) => setCustomerRuc(e.target.value)}
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>
              <div className="col-span-6">
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">Razón Social *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary text-xs truncate"
                />
              </div>
            </div>

            {/* Selector de Obra / Destino para este cliente */}
            <div className="p-2.5 rounded-md bg-[#0b0f19] border border-card-border space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono text-primary flex items-center gap-1 font-semibold">
                  <Building2 className="w-3.5 h-3.5 text-primary" /> Obra / Destino de Entrega
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(true)}
                  className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded transition-colors"
                >
                  <PlusCircle className="w-3 h-3" /> + Nueva Obra
                </button>
              </div>

              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-2 py-1.5 text-foreground text-xs focus:outline-none focus:border-primary"
              >
                <option value="">(Sin Obra Asignada - Venta General / Mostrador)</option>
                {customerProjects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name} ({proj.address})
                  </option>
                ))}
              </select>

              {selectedProjectId && (
                <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 pt-1">
                  <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {customerProjects.find((p) => p.id === selectedProjectId)?.address}
                  </span>
                </div>
              )}
            </div>

            {/* Condición y Método de Pago */}
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
                  <option value="TRANSFERENCIA_BANCARIA">Transferencia SIPAP</option>
                  <option value="TARJETA_DEBITO">Tarjeta Débito</option>
                  <option value="TARJETA_CREDITO">Tarjeta Crédito</option>
                  <option value="CHEQUE">Cheque al Día</option>
                </select>
              </div>
            </div>

            {/* Sección Desplegable: Logística y Despacho */}
            <div className="border border-card-border rounded-md bg-[#0b0f19] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDeliverySection(!showDeliverySection)}
                className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-muted/20 transition-colors"
              >
                <span className="text-[11px] font-mono uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-warning" /> Despacho, Chofer & Ayudantes
                </span>
                {showDeliverySection ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>

              {showDeliverySection && (
                <div className="p-3 border-t border-card-border space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono text-muted-foreground mb-1">Chofer Responsable</label>
                      <select
                        value={driverId}
                        onChange={(e) => setDriverId(e.target.value)}
                        className="w-full bg-[#0d121c] border border-card-border rounded-md px-2 py-1 text-foreground text-xs"
                      >
                        <option value="">(Mostrador / Retiro Propio)</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName} ({emp.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-muted-foreground mb-1">Estado de Entrega</label>
                      <select
                        value={deliveryStatus}
                        onChange={(e) => setDeliveryStatus(e.target.value)}
                        className="w-full bg-[#0d121c] border border-card-border rounded-md px-2 py-1 text-foreground text-xs"
                      >
                        <option value="DELIVERED">Entregado en Destino</option>
                        <option value="IN_TRANSIT">En Camino (Cargado en Camión)</option>
                        <option value="PENDING">Pendiente de Despacho</option>
                        <option value="STORE_PICKUP">Retirado en Depósito</option>
                      </select>
                    </div>
                  </div>

                  {/* Vehículo / Chapa */}
                  <div>
                    <label className="block text-[10px] font-mono text-muted-foreground mb-1">Vehículo / Chapa</label>
                    <input
                      type="text"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value)}
                      placeholder="Ej: Camión Scania 4M - Chapa ABC 123"
                      className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1 text-foreground text-xs font-mono"
                    />
                  </div>

                  {/* Ayudantes de descarga */}
                  <div>
                    <label className="block text-[10px] font-mono text-muted-foreground mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3 text-muted-foreground" /> Ayudante(s) de Cuadrilla:
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1 bg-[#0d121c] border border-card-border rounded-md">
                      {employees.map((emp) => {
                        const isSelected = selectedHelperIds.includes(emp.id);
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => toggleHelper(emp.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors border ${
                              isSelected
                                ? 'bg-primary/20 border-primary text-primary font-bold'
                                : 'bg-card border-card-border text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {emp.firstName} {emp.lastName.charAt(0)}.
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Observaciones de entrega */}
                  <div>
                    <label className="block text-[10px] font-mono text-muted-foreground mb-1">Notas / Instrucciones al Chofer</label>
                    <input
                      type="text"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="Ej: Entregar al capataz Arq. Martínez antes de las 16hs"
                      className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1 text-foreground text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desglose impositivo fiscal */}
          <div className="p-3.5 rounded-lg bg-[#0d121c] border border-card-border font-mono text-xs space-y-1.5">
            <div className="flex justify-between text-muted-foreground text-[11px]">
              <span>Gravada IVA 10%:</span>
              <span>{formatCurrencyPYG(breakdown.taxable10)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground text-[11px]">
              <span>Liquidación IVA 10% (Base / 11):</span>
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

      {/* Modal: Registro Rápido de Nueva Obra para el Cliente */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-card-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-card-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Registrar Nueva Obra para Cliente</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewProjectModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-5 space-y-3.5 text-xs">
              <div className="bg-[#0d121c] p-2.5 rounded-lg border border-card-border text-[11px] font-mono">
                <span className="text-muted-foreground">Cliente Asignado: </span>
                <span className="font-bold text-foreground">{customerName}</span>
                <div className="text-muted-foreground text-[10px]">RUC: {customerRuc}</div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">Nombre o Identificador de Obra *</label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Ej: Edificio Altamira - Torre B, Casa Quinta San Bernardino..."
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">Dirección Exacta de Descarga *</label>
                <input
                  type="text"
                  required
                  value={newProjectAddress}
                  onChange={(e) => setNewProjectAddress(e.target.value)}
                  placeholder="Ej: Avda. Molas López c/ San Martín, Asunción"
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">Capataz / Encargado</label>
                  <input
                    type="text"
                    value={newProjectContact}
                    onChange={(e) => setNewProjectContact(e.target.value)}
                    placeholder="Ej: Arq. Carlos Vera"
                    className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">Teléfono en Obra</label>
                  <input
                    type="text"
                    value={newProjectPhone}
                    onChange={(e) => setNewProjectPhone(e.target.value)}
                    placeholder="Ej: 0981 123456"
                    className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-3 py-1.5 rounded-md border border-card-border text-muted-foreground hover:bg-muted/20"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProject}
                  className="px-4 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white font-medium flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{savingProject ? 'Guardando...' : 'Crear Obra'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

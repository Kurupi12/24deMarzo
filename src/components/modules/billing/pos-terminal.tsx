'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Minus,
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
  AlertTriangle,
  Layers,
  Printer,
  FileText,
} from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { calculateVatBreakdown } from '@/shared/utils/vat-calculator';
import { validateParaguayRuc } from '@/shared/utils/ruc-validator';
import { useCustomDialog } from '@/components/common/custom-dialog-provider';

export function PosTerminal({ onSaleCompleted }: { onSaleCompleted: (sale?: any) => void }) {
  const { alert: customAlert } = useCustomDialog();
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  
  // Cliente & Facturación
  const [customerName, setCustomerName] = useState('Sin Nombre (Consumidor Final)');
  const [customerRuc, setCustomerRuc] = useState('44444401-7');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentCondition, setPaymentCondition] = useState('CONTADO');
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [paymentReference, setPaymentReference] = useState('');

  // Directorio y Autocompletado SIFEN de Clientes
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Multi-obra por Cliente
  const [customerProjects, setCustomerProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectAddress, setNewProjectAddress] = useState('');
  const [newProjectContact, setNewProjectContact] = useState('');
  const [newProjectPhone, setNewProjectPhone] = useState('');
  const [savingProject, setSavingProject] = useState(false);

  // Flota y Logística de Despacho (1er Envío / Camión Principal)
  const [showDeliverySection, setShowDeliverySection] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  
  const [driverId, setDriverId] = useState<string>('');
  const [selectedHelperIds, setSelectedHelperIds] = useState<string[]>([]);
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [deliveryStatus, setDeliveryStatus] = useState<string>('DELIVERED');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');

  // 2do Camión y 2do Chofer (para pedidos divididos o de gran volumen)
  const [enableSecondaryDelivery, setEnableSecondaryDelivery] = useState(false);
  const [secondaryDriverId, setSecondaryDriverId] = useState<string>('');
  const [secondaryVehiclePlate, setSecondaryVehiclePlate] = useState<string>('');
  const [secondaryHelperIds, setSecondaryHelperIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  // Auto-enfocar y seleccionar la cantidad al agregar un producto
  useEffect(() => {
    if (lastAddedId) {
      const el = document.getElementById(`qty-input-${lastAddedId}`) as HTMLInputElement;
      if (el) {
        el.focus();
        el.select();
      }
      setLastAddedId(null);
    }
  }, [lastAddedId]);

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

  // Cargar Flota de Vehículos Oficiales
  useEffect(() => {
    fetch('/api/v1/logistics/vehicles')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data && json.data.length > 0) {
          setVehicles(json.data);
          if (!vehiclePlate) {
            setVehiclePlate(json.data[0].plateNumber);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Cargar lista de clientes para autocompletado SIFEN
  useEffect(() => {
    const query = customerSearch.trim();
    fetch(`/api/v1/billing/customers?query=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setCustomersList(json.data);
        }
      })
      .catch(() => {});
  }, [customerSearch]);

  // Cerrar menú flotante de clientes al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCustomer = (customer: { name: string; ruc: string; address?: string }) => {
    setCustomerName(customer.name);
    setCustomerRuc(customer.ruc);
    if (customer.address) {
      setCustomerAddress(customer.address);
    }
    setShowCustomerDropdown(false);
    setCustomerSearch('');
  };

  // Cargar Obras del Cliente al cambiar RUC
  useEffect(() => {
    if (customerRuc && customerRuc.trim().length >= 4) {
      fetch(`/api/v1/billing/projects?customerRuc=${encodeURIComponent(customerRuc.trim())}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            setCustomerProjects(json.data || []);
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
          originalPrice: Number(product.salePrice),
          costPrice: Number(product.costPrice) || 0,
          vatRate: product.vatRate,
          quantity: 1,
        },
      ]);
    }
    setProductSearch('');
    setSearchResults([]);
    setLastAddedId(product.id);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((i) => i.productId !== productId));
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) return removeFromCart(productId);
    setCart(cart.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)));
  };

  // Modificar precio de venta unitario negociado para un cliente
  const updateUnitPrice = (productId: string, newPrice: number) => {
    if (newPrice < 0) return;
    setCart(cart.map((i) => (i.productId === productId ? { ...i, unitPrice: newPrice } : i)));
  };

  const toggleHelper = (id: string, isSecondary = false) => {
    if (isSecondary) {
      if (secondaryHelperIds.includes(id)) {
        setSecondaryHelperIds(secondaryHelperIds.filter((h) => h !== id));
      } else {
        setSecondaryHelperIds([...secondaryHelperIds, id]);
      }
    } else {
      if (selectedHelperIds.includes(id)) {
        setSelectedHelperIds(selectedHelperIds.filter((h) => h !== id));
      } else {
        setSelectedHelperIds([...selectedHelperIds, id]);
      }
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newProjectAddress.trim()) {
      customAlert({
        title: 'Campos Obligatorios',
        message: 'El nombre y la dirección de la obra son obligatorios.',
        variant: 'warning',
      });
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
        customAlert({
          title: 'Error al Guardar Obra',
          message: data.error?.message || 'No se pudo guardar la obra en el sistema.',
          variant: 'danger',
        });
      }
    } finally {
      setSavingProject(false);
    }
  };

  // Desglose impositivo en tiempo real (considerando el precio negociado)
  const breakdown = calculateVatBreakdown(
    cart.map((i) => ({ total: i.quantity * i.unitPrice, vatRate: i.vatRate }))
  );

  const rucValidation = validateParaguayRuc(customerRuc);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      customAlert({
        title: 'Carrito Vacío',
        message: 'Debe agregar al menos un producto al carrito para facturar.',
        variant: 'warning',
      });
      return;
    }

    if (paymentMethod === 'TRANSFERENCIA_BANCARIA' && !paymentReference.trim()) {
      customAlert({
        title: 'Comprobante de Transferencia Requerido',
        message: 'Cuando el pago es por transferencia bancaria (SIPAP), es obligatorio cargar el número de comprobante para tener un registro.',
        variant: 'warning',
      });
      return;
    }

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
          paymentReference: paymentReference.trim() || null,
          projectId: selectedProjectId || null,
          driverId: driverId || null,
          helperIds: selectedHelperIds,
          vehiclePlate: vehiclePlate || null,
          deliveryStatus,
          deliveryNotes: deliveryNotes || null,
          // 2do Chofer y 2do Camión si está habilitado
          secondaryDriverId: enableSecondaryDelivery ? (secondaryDriverId || null) : null,
          secondaryVehiclePlate: enableSecondaryDelivery ? (secondaryVehiclePlate || null) : null,
          secondaryHelperIds: enableSecondaryDelivery ? secondaryHelperIds : [],
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
        setPaymentReference('');
        setSelectedProjectId('');
        setDeliveryNotes('');
        setEnableSecondaryDelivery(false);
        setSecondaryDriverId('');
        setSecondaryVehiclePlate('');
        setSecondaryHelperIds([]);
        // Disparar la apertura inmediata del comprobante fiscal y recibo de despacho
        onSaleCompleted(data.data);
      } else {
        customAlert({
          title: 'Error de Facturación',
          message: data.error?.message || 'No se pudo emitir la factura en el sistema.',
          variant: 'danger',
        });
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
            ref={searchInputRef}
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Buscar por SKU o descripción (ej: Cemento, Varilla, Cal, Ladrillo, Arena)..."
            className="w-full bg-[#0d121c] border border-card-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono"
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

        {/* Lista del carrito con Precio Editable */}
        <div className="bg-card border border-card-border rounded-lg p-4 min-h-[380px] flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-card-border text-[11px] font-mono text-muted-foreground uppercase">
              <span>Material / Producto (Precio Unit. Editable)</span>
              <span>Subtotal</span>
            </div>
            {cart.length === 0 ? (
              <div className="text-center py-16">
                <ReceiptText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Carrito vacío. Busque y agregue materiales arriba.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {cart.map((item) => {
                  const isBelowCost = item.costPrice > 0 && item.unitPrice < item.costPrice;
                  const isModified = item.unitPrice !== item.originalPrice;

                  return (
                    <div key={item.productId} className="p-2.5 rounded bg-[#0d121c] border border-card-border text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 pr-2 truncate">
                          <p className="font-medium text-foreground truncate">{item.name}</p>
                          <span className="text-[10px] text-muted-foreground font-mono">SKU: {item.sku}</span>
                          {isModified && (
                            <span className="ml-2 text-[9px] font-mono text-primary bg-primary/10 px-1 py-0.2 rounded border border-primary/20">
                              Precio de lista: {formatCurrencyPYG(item.originalPrice)}
                            </span>
                          )}
                          {isBelowCost && (
                            <div className="inline-flex items-center gap-1 text-[9px] font-mono text-warning bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20 ml-2">
                              <AlertTriangle className="w-3 h-3 text-warning" />
                              <span>Alerta: Menor al costo ({formatCurrencyPYG(item.costPrice)})</span>
                            </div>
                          )}
                        </div>

                        <button type="button" onClick={() => removeFromCart(item.productId)} className="text-muted-foreground hover:text-danger p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-card-border/60">
                        {/* Selector Ergonómico de Cantidad con NumPad Rápido */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-muted-foreground font-semibold">Cant:</span>
                          <div className="inline-flex items-center rounded border border-card-border bg-card">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                              title="Restar 1"
                              className="px-1.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              id={`qty-input-${item.productId}`}
                              type="number"
                              min="1"
                              value={item.quantity}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  searchInputRef.current?.focus();
                                }
                              }}
                              onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                              className="w-14 bg-transparent text-center font-mono text-foreground font-bold text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:bg-primary/10"
                            />
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              title="Sumar 1"
                              className="px-1.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Botones de Volumen Rápido para Materiales de Construcción */}
                          <div className="hidden sm:flex items-center gap-1 ml-1">
                            {[10, 50, 100].map((step) => (
                              <button
                                key={step}
                                type="button"
                                onClick={() => updateQuantity(item.productId, item.quantity + step)}
                                title={`Sumar ${step} unidades`}
                                className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-card hover:bg-primary/20 border border-card-border hover:border-primary/40 text-muted-foreground hover:text-primary transition-colors"
                              >
                                +{step}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Modificador de Precio Unitario (Precio Negociado) */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-muted-foreground font-semibold">P. Unit:</span>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={item.unitPrice}
                            onFocus={(e) => e.target.select()}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                searchInputRef.current?.focus();
                              }
                            }}
                            onChange={(e) => updateUnitPrice(item.productId, parseInt(e.target.value) || 0)}
                            className={`w-28 bg-card border rounded px-2 py-0.5 text-right font-mono font-bold text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:bg-primary/10 ${
                              isBelowCost ? 'border-warning text-warning' : isModified ? 'border-primary text-primary' : 'border-card-border text-foreground'
                            }`}
                          />
                        </div>

                        {/* Subtotal de Fila */}
                        <span className="w-24 text-right font-mono font-bold text-foreground text-xs">
                          {formatCurrencyPYG(item.quantity * item.unitPrice)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Columna Derecha: Datos Fiscales, Obras y Logística con Doble Camión */}
      <div className="lg:col-span-5 bg-card border border-card-border rounded-lg p-5 flex flex-col justify-between space-y-4">
        <form onSubmit={handleCheckout} className="space-y-3 font-sans text-xs flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Cabecera SIFEN */}
            <div className="flex items-center justify-between pb-2 border-b border-card-border">
              <span className="text-xs font-mono uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Datos del Cliente & SIFEN
              </span>
              <button
                type="button"
                onClick={() =>
                  handleSelectCustomer({
                    name: 'Sin Nombre (Consumidor Final)',
                    ruc: '44444401-7',
                    address: 'Mostrador / Planta Central',
                  })
                }
                className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1"
              >
                <span>Consumidor Final</span>
              </button>
            </div>

            {/* Buscador y Selector Autocompletable de Clientes */}
            <div className="relative" ref={customerDropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono text-muted-foreground">
                  Buscar o Seleccionar Cliente (por Nombre o RUC)
                </label>
                {customersList.length > 0 && (
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {customersList.length} registrados
                  </span>
                )}
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Escriba nombre de empresa, arquitecto o RUC..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="w-full bg-[#0d121c] border border-card-border rounded-md pl-8 pr-8 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Menú Flotante de Resultados de Clientes */}
              {showCustomerDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#0b0f19] border border-card-border rounded-lg shadow-2xl z-40 max-h-56 overflow-y-auto divide-y divide-card-border">
                  {customersList.length === 0 ? (
                    <div className="p-3 text-center text-muted-foreground text-[11px]">
                      No se encontraron clientes registrados con ese criterio. Puede ingresar los datos manualmente en los campos inferiores.
                    </div>
                  ) : (
                    customersList.map((cust) => (
                      <button
                        key={cust.id || cust.ruc}
                        type="button"
                        onClick={() => handleSelectCustomer(cust)}
                        className="w-full text-left px-3 py-2 hover:bg-muted/20 transition-colors flex items-center justify-between group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-foreground text-xs group-hover:text-primary transition-colors truncate">
                            {cust.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">
                            {cust.address || 'Sin dirección registrada'} {cust.phone ? `• Tel: ${cust.phone}` : ''}
                          </p>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono bg-card border border-card-border text-primary font-bold">
                          {cust.ruc}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* RUC y Nombre (Editables) */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-5">
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
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1.5 font-mono font-bold text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>
              <div className="col-span-7">
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">Razón Social *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1.5 text-foreground font-semibold focus:outline-none focus:border-primary text-xs truncate"
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

            {/* Campo Condicional: Comprobante de Transferencia SIPAP */}
            {paymentMethod === 'TRANSFERENCIA_BANCARIA' && (
              <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono font-semibold text-blue-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>N° de Comprobante de Transferencia SIPAP *</span>
                  </label>
                  <span className="text-[9px] font-mono bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">
                    Obligatorio
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Ej: 10485920 / Banco Continental / Ueno"
                  className="w-full bg-[#0d121c] border border-blue-500/40 rounded-md px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-400 font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground font-sans">
                  Quedará registrado para auditoría y se imprimirá en la Orden de Entrega y Factura.
                </p>
              </div>
            )}

            {/* Campo Condicional: N° de Cheque */}
            {paymentMethod === 'CHEQUE' && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono font-semibold text-amber-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>N° de Cheque / Banco Emisor *</span>
                  </label>
                  <span className="text-[9px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                    Obligatorio
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Ej: CHQ-901824 - Banco Itaú"
                  className="w-full bg-[#0d121c] border border-amber-500/40 rounded-md px-2.5 py-1.5 text-foreground font-mono text-xs"
                />
              </div>
            )}

            {/* Logística y Despacho con Soporte de Dos Choferes y Camiones */}
            <div className="border border-card-border rounded-md bg-[#0b0f19] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDeliverySection(!showDeliverySection)}
                className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-muted/20 transition-colors"
              >
                <span className="text-[11px] font-mono uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-warning" /> Despacho, Choferes & Flota de Camiones
                </span>
                {showDeliverySection ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>

              {showDeliverySection && (
                <div className="p-3 border-t border-card-border space-y-3">
                  {/* CAMIÓN Y CHOFER PRINCIPAL (ENVÍO 1) */}
                  <div className="p-2.5 rounded bg-[#0d121c] border border-card-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-foreground flex items-center gap-1">
                        <Truck className="w-3 h-3 text-primary" /> Camión 1 (Envío Principal)
                      </span>
                      <select
                        value={deliveryStatus}
                        onChange={(e) => setDeliveryStatus(e.target.value)}
                        className="bg-card border border-card-border rounded px-1.5 py-0.5 text-foreground text-[10px] font-mono"
                      >
                        <option value="DELIVERED">Entregado</option>
                        <option value="IN_TRANSIT">En Camino</option>
                        <option value="PENDING">Pendiente</option>
                        <option value="STORE_PICKUP">Retiro Mostrador</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-mono text-muted-foreground mb-0.5">Chofer 1</label>
                        <select
                          value={driverId}
                          onChange={(e) => setDriverId(e.target.value)}
                          className="w-full bg-card border border-card-border rounded px-2 py-1 text-foreground text-xs"
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
                        <label className="block text-[10px] font-mono text-muted-foreground mb-0.5">Camión / Chapa 1</label>
                        <select
                          value={vehiclePlate}
                          onChange={(e) => setVehiclePlate(e.target.value)}
                          className="w-full bg-card border border-card-border rounded px-2 py-1 text-foreground text-xs font-mono"
                        >
                          <option value="">(Sin vehículo oficial)</option>
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.plateNumber}>
                              {v.plateNumber} &bull; {v.brand} {v.model} ({v.capacityTons || 0} Tn)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Ayudantes Cuadrilla 1 */}
                    <div>
                      <label className="block text-[9px] font-mono text-muted-foreground mb-1 flex items-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" /> Ayudantes Cuadrilla 1:
                      </label>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto p-1 bg-card border border-card-border rounded">
                        {employees.map((emp) => {
                          const isSelected = selectedHelperIds.includes(emp.id);
                          return (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => toggleHelper(emp.id, false)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                                isSelected ? 'bg-primary/20 border-primary text-primary font-bold' : 'border-card-border text-muted-foreground'
                              }`}
                            >
                              {emp.firstName} {emp.lastName.charAt(0)}.
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* BOTÓN OBLIGATORIO PARA 2DO CAMIÓN */}
                  {!enableSecondaryDelivery ? (
                    <button
                      type="button"
                      onClick={() => setEnableSecondaryDelivery(true)}
                      className="w-full py-1.5 rounded border border-dashed border-primary/50 hover:border-primary text-primary hover:bg-primary/5 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>+ Cargar 2do Camión / Chofer (Pedido Dividido)</span>
                    </button>
                  ) : (
                    /* CAMIÓN Y CHOFER SECUNDARIO (ENVÍO 2) */
                    <div className="p-2.5 rounded bg-[#0d121c] border border-primary/30 space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-accent flex items-center gap-1">
                          <Truck className="w-3 h-3 text-accent" /> Camión 2 (Segundo Envío de la Misma Factura)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEnableSecondaryDelivery(false);
                            setSecondaryDriverId('');
                            setSecondaryVehiclePlate('');
                            setSecondaryHelperIds([]);
                          }}
                          className="text-muted-foreground hover:text-danger text-[10px] font-mono flex items-center gap-0.5"
                        >
                          <X className="w-3 h-3" /> Quitar 2do Camión
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-mono text-muted-foreground mb-0.5">Chofer 2</label>
                          <select
                            value={secondaryDriverId}
                            onChange={(e) => setSecondaryDriverId(e.target.value)}
                            className="w-full bg-card border border-card-border rounded px-2 py-1 text-foreground text-xs"
                          >
                            <option value="">(Seleccionar Chofer 2)</option>
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.firstName} {emp.lastName} ({emp.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-muted-foreground mb-0.5">Camión / Chapa 2</label>
                          <select
                            value={secondaryVehiclePlate}
                            onChange={(e) => setSecondaryVehiclePlate(e.target.value)}
                            className="w-full bg-card border border-card-border rounded px-2 py-1 text-foreground text-xs font-mono"
                          >
                            <option value="">(Seleccionar Camión 2)</option>
                            {vehicles.map((v) => (
                              <option key={v.id} value={v.plateNumber}>
                                {v.plateNumber} &bull; {v.brand} {v.model} ({v.capacityTons || 0} Tn)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Ayudantes Cuadrilla 2 */}
                      <div>
                        <label className="block text-[9px] font-mono text-muted-foreground mb-1 flex items-center gap-1">
                          <Users className="w-3 h-3 text-muted-foreground" /> Ayudantes Cuadrilla 2:
                        </label>
                        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto p-1 bg-card border border-card-border rounded">
                          {employees.map((emp) => {
                            const isSelected = secondaryHelperIds.includes(emp.id);
                            return (
                              <button
                                key={emp.id}
                                type="button"
                                onClick={() => toggleHelper(emp.id, true)}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                                  isSelected ? 'bg-accent/20 border-accent text-accent font-bold' : 'border-card-border text-muted-foreground'
                                }`}
                              >
                                {emp.firstName} {emp.lastName.charAt(0)}.
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Observaciones generales de entrega */}
                  <div>
                    <label className="block text-[10px] font-mono text-muted-foreground mb-1">Notas / Instrucciones de Entrega</label>
                    <input
                      type="text"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="Ej: Entregar al capataz en obra antes de las 16hs"
                      className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1 text-foreground text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desglose impositivo fiscal con precios negociados */}
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

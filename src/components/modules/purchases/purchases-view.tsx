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
  Users,
  Phone,
  Mail,
  MapPin,
  Pencil,
  Tag,
  CreditCard,
  ChevronDown,
} from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const SUPPLIER_CATEGORIES = [
  { value: 'ALL', label: 'Todos los Rubros' },
  { value: 'CEMENTERA', label: 'Cementos & Ligantes' },
  { value: 'HIERROS', label: 'Hierros & Aceros' },
  { value: 'CERAMICAS', label: 'Cerámicas & Ladrillos' },
  { value: 'ARIDOS', label: 'Cantera, Arena & Áridos' },
  { value: 'HERRAMIENTAS', label: 'Ferretería & Maquinarias' },
  { value: 'GENERAL', label: 'Materiales Generales' },
];

export function PurchasesView() {
  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers'>('purchases');

  // --- Estados de Compras ---
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
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
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  // Buscador de productos para compra
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);
  const [savingPurchase, setSavingPurchase] = useState(false);

  // --- Estados de Proveedores ---
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [supplierQuery, setSupplierQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [savingSupplier, setSavingSupplier] = useState(false);

  // Formulario de Proveedor
  const [formRuc, setFormRuc] = useState('');
  const [formName, setFormName] = useState('');
  const [formTradeName, setFormTradeName] = useState('');
  const [formCategory, setFormCategory] = useState('GENERAL');
  const [formContactName, setFormContactName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCreditDays, setFormCreditDays] = useState('0');
  const [formNotes, setFormNotes] = useState('');

  // Cargar compras
  const fetchPurchases = async () => {
    setLoadingPurchases(true);
    try {
      const res = await fetch(`/api/v1/inventory/purchases?search=${encodeURIComponent(searchQuery)}`);
      const json = await res.json();
      if (json.success) {
        setPurchases(json.data || []);
      }
    } finally {
      setLoadingPurchases(false);
    }
  };

  // Cargar proveedores
  const fetchSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const res = await fetch(
        `/api/v1/inventory/suppliers?query=${encodeURIComponent(supplierQuery)}&category=${encodeURIComponent(selectedCategory)}`
      );
      const json = await res.json();
      if (json.success) {
        setSuppliers(json.data || []);
      }
    } finally {
      setLoadingSuppliers(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [searchQuery]);

  useEffect(() => {
    fetchSuppliers();
  }, [supplierQuery, selectedCategory]);

  // Buscar productos mientras tipea en la compra
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

  // Seleccionar proveedor en la factura
  const selectSupplierForPurchase = (sup: any) => {
    setSupplierRuc(sup.ruc);
    setSupplierName(sup.name);
    if (sup.creditDays && sup.creditDays > 0) {
      setPaymentCondition('CREDITO_30');
    } else {
      setPaymentCondition('CONTADO');
    }
    setShowSupplierDropdown(false);
  };

  // Guardar factura de compra
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
      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        setInvoiceNumber('');
        setSupplierName('');
        setSupplierRuc('');
        setItems([]);
        setNotes('');
        await fetchPurchases();
        await fetchSuppliers();
        alert('Factura de compra asentada exitosamente. Stock y costo promedio ponderado actualizados.');
      } else {
        alert(json.error?.message || 'Error al asentar factura de compra');
      }
    } finally {
      setSavingPurchase(false);
    }
  };

  // Abrir modal de proveedor
  const openSupplierModal = (sup?: any) => {
    if (sup) {
      setEditingSupplier(sup);
      setFormRuc(sup.ruc || '');
      setFormName(sup.name || '');
      setFormTradeName(sup.tradeName || '');
      setFormCategory(sup.category || 'GENERAL');
      setFormContactName(sup.contactName || '');
      setFormPhone(sup.phone || '');
      setFormEmail(sup.email || '');
      setFormAddress(sup.address || '');
      setFormCity(sup.city || '');
      setFormCreditDays(String(sup.creditDays || 0));
      setFormNotes(sup.notes || '');
    } else {
      setEditingSupplier(null);
      setFormRuc('');
      setFormName('');
      setFormTradeName('');
      setFormCategory('GENERAL');
      setFormContactName('');
      setFormPhone('');
      setFormEmail('');
      setFormAddress('');
      setFormCity('Asunción');
      setFormCreditDays('0');
      setFormNotes('');
    }
    setShowSupplierModal(true);
  };

  // Guardar Proveedor
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSupplier(true);
    try {
      const res = await fetch('/api/v1/inventory/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSupplier?.id,
          ruc: formRuc.trim(),
          name: formName.trim(),
          tradeName: formTradeName.trim() || undefined,
          category: formCategory,
          contactName: formContactName.trim() || undefined,
          phone: formPhone.trim() || undefined,
          email: formEmail.trim() || undefined,
          address: formAddress.trim() || undefined,
          city: formCity.trim() || undefined,
          creditDays: Number(formCreditDays) || 0,
          notes: formNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowSupplierModal(false);
        await fetchSuppliers();
      } else {
        alert(json.error?.message || 'Error al guardar proveedor');
      }
    } finally {
      setSavingSupplier(false);
    }
  };

  // Desactivar / dar de baja proveedor
  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!confirm(`¿Dar de baja al proveedor "${name}"? No se eliminarán sus facturas pasadas.`)) return;
    try {
      const res = await fetch(`/api/v1/inventory/suppliers?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        await fetchSuppliers();
      }
    } catch {
      alert('Error al desactivar proveedor');
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera del Módulo con Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-card-border p-5 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
              Gestión de Compras & Proveedores
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Control integral de entradas a depósito, catálogo oficial de proveedores y valuación automática de costos en Kardex.
          </p>
        </div>

        {/* Botones de Acción según el Tab */}
        <div className="flex items-center gap-2">
          {activeTab === 'purchases' ? (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Factura de Compra</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openSupplierModal()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Proveedor</span>
            </button>
          )}
        </div>
      </div>

      {/* Selector de Pestañas (Tabs) */}
      <div className="flex items-center gap-2 border-b border-card-border pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-mono text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'purchases'
              ? 'border-primary text-primary bg-card/60'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Facturas de Entrada & Kardex ({purchases.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-mono text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'suppliers'
              ? 'border-primary text-primary bg-card/60'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Registro de Proveedores ({suppliers.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: FACTURAS DE COMPRA */}
      {/* ========================================================================= */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
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
            {loadingPurchases ? (
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: REGISTRO DE PROVEEDORES */}
      {/* ========================================================================= */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          {/* Barra de Búsqueda y Filtros de Proveedores */}
          <div className="bg-card border border-card-border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={supplierQuery}
                onChange={(e) => setSupplierQuery(e.target.value)}
                placeholder="Buscar por RUC, Razón Social, nombre comercial o contacto..."
                className="w-full bg-[#0d121c] border border-card-border rounded-lg pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-[#0d121c] border border-card-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
              >
                {SUPPLIER_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabla de Directorio de Proveedores */}
          <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-lg">
            {loadingSuppliers ? (
              <div className="p-12 text-center text-xs text-muted-foreground font-mono">
                Consultando directorio maestro de proveedores en Neon Postgres...
              </div>
            ) : suppliers.length === 0 ? (
              <div className="p-16 text-center text-xs text-muted-foreground">
                <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-foreground font-medium">No se encontraron proveedores registrados.</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Haga clic en &quot;Nuevo Proveedor&quot; para registrar un proveedor oficial al sistema.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0d121c] border-b border-card-border text-[11px] font-mono uppercase text-muted-foreground">
                    <tr>
                      <th className="py-3 px-4">Razón Social & Marca</th>
                      <th className="py-3 px-4">RUC Oficial</th>
                      <th className="py-3 px-4">Rubro Principal</th>
                      <th className="py-3 px-4">Contacto / Teléfono</th>
                      <th className="py-3 px-4">Ubicación</th>
                      <th className="py-3 px-4 text-center">Crédito</th>
                      <th className="py-3 px-4 text-center">Entradas</th>
                      <th className="py-3 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border font-sans">
                    {suppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-foreground text-xs">{s.name}</p>
                          {s.tradeName && (
                            <span className="text-[10px] text-primary font-mono font-semibold">
                              Marca: {s.tradeName}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-accent">
                          {s.ruc}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-card border border-card-border text-foreground">
                            {s.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono">
                          <p className="text-foreground">{s.contactName || 'Sin contacto fijo'}</p>
                          {s.phone && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5 text-emerald-400" /> {s.phone}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-muted-foreground font-mono">
                          <p className="text-foreground">{s.city || 'Asunción'}</p>
                          <p className="text-[10px] truncate max-w-xs">{s.address || '—'}</p>
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          {s.creditDays > 0 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-primary/10 border border-primary/30 text-primary font-bold">
                              {s.creditDays} días
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-muted/40 border border-card-border text-muted-foreground">
                              Contado
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-foreground">
                          {s._count?.purchases || 0}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openSupplierModal(s)}
                              title="Editar Proveedor"
                              className="p-1.5 rounded bg-[#0d121c] border border-card-border hover:border-primary text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSupplier(s.id, s.name)}
                              title="Dar de Baja"
                              className="p-1.5 rounded bg-[#0d121c] border border-card-border hover:border-danger text-muted-foreground hover:text-danger transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTRAR NUEVA FACTURA DE COMPRA */}
      {/* ========================================================================= */}
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
              {/* Chips de Selección Rápida de Proveedor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">Proveedores Habituales (1 Clic):</span>
                  <button
                    type="button"
                    onClick={() => openSupplierModal()}
                    className="text-[10px] font-mono text-primary hover:underline"
                  >
                    + Nuevo Proveedor en Catálogo
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {suppliers.slice(0, 6).map((sup) => (
                    <button
                      key={sup.id}
                      type="button"
                      onClick={() => selectSupplierForPurchase(sup)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                        supplierRuc === sup.ruc
                          ? 'bg-primary/20 border-primary text-primary font-bold'
                          : 'bg-[#0d121c] hover:bg-card border-card-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {sup.tradeName || sup.name.split(' ')[0]} ({sup.ruc.split('-')[0]})
                    </button>
                  ))}
                </div>
              </div>

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
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="w-full bg-card border border-card-border rounded-md px-2.5 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">RUC del Proveedor *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 80000001-3"
                    value={supplierRuc}
                    onChange={(e) => setSupplierRuc(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="w-full bg-card border border-card-border rounded-md px-2.5 py-1.5 font-mono font-bold text-foreground focus:outline-none focus:border-primary text-xs"
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
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
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
                    className="w-full bg-[#0d121c] border border-card-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono"
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

              {/* Tabla de Artículos a Ingresar */}
              <div className="border border-card-border rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0d121c] text-muted-foreground font-mono text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-3">Artículo</th>
                      <th className="py-2 px-3 text-center w-24">Cantidad</th>
                      <th className="py-2 px-3 text-right w-36">Costo Unit. (₲)</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                      <th className="py-2 px-3 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border font-mono">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground text-xs">
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
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              className="w-16 bg-card border border-card-border rounded px-1.5 py-0.5 text-center text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={it.unitCost}
                              onChange={(e) => updateItemCost(it.productId, parseInt(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              className="w-28 bg-card border border-card-border rounded px-1.5 py-0.5 text-right text-foreground font-mono text-xs focus:outline-none focus:border-primary"
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
                    <span>Condición de Pago:</span>
                    <select
                      value={paymentCondition}
                      onChange={(e) => setPaymentCondition(e.target.value)}
                      className="bg-card border border-card-border rounded px-2 py-0.5 text-foreground text-xs"
                    >
                      <option value="CONTADO">Contado</option>
                      <option value="CREDITO_15">Crédito 15 días</option>
                      <option value="CREDITO_30">Crédito 30 días</option>
                      <option value="CREDITO_45">Crédito 45 días</option>
                      <option value="CREDITO_60">Crédito 60 días</option>
                    </select>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-card-border text-foreground font-bold">
                    <span>Total Factura Compra:</span>
                    <span className="text-emerald-400 text-sm">{formatCurrencyPYG(grandTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-card-border text-muted-foreground hover:text-foreground text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPurchase || items.length === 0}
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingPurchase ? 'Guardando Entrada...' : 'Asentar Factura en Kardex'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREAR O EDITAR PROVEEDOR */}
      {/* ========================================================================= */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-card-border rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-card-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  {editingSupplier ? 'Editar Proveedor de Materiales' : 'Registrar Nuevo Proveedor'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSupplierModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">RUC Oficial con DV *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 80000001-3"
                    value={formRuc}
                    onChange={(e) => setFormRuc(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1.5 font-mono font-bold text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
                <div className="col-span-7">
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">Razón Social Oficial *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Industria Nacional del Cemento"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">Nombre Comercial / Marca</label>
                  <input
                    type="text"
                    placeholder="Ej: INC Vallemí / Cemento Yguazú"
                    value={formTradeName}
                    onChange={(e) => setFormTradeName(e.target.value)}
                    className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">Rubro Principal *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary text-xs font-mono"
                  >
                    <option value="CEMENTERA">Cementos & Ligantes</option>
                    <option value="HIERROS">Hierros & Aceros</option>
                    <option value="CERAMICAS">Cerámicas & Ladrillos</option>
                    <option value="ARIDOS">Cantera, Arena & Áridos</option>
                    <option value="HERRAMIENTAS">Ferretería & Maquinarias</option>
                    <option value="GENERAL">Materiales Generales</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">Contacto / Asesor</label>
                  <input
                    type="text"
                    placeholder="Ej: Lic. Roberto Benítez"
                    value={formContactName}
                    onChange={(e) => setFormContactName(e.target.value)}
                    className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ej: 021-442233 / 0981-123456"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-8">
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">Email de Facturación / Pedidos</label>
                  <input
                    type="email"
                    placeholder="Ej: pedidos@proveedor.com.py"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary text-xs font-mono"
                  />
                </div>
                <div className="col-span-4">
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">Días Crédito</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={formCreditDays}
                    onChange={(e) => setFormCreditDays(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">Dirección de Planta / Sucursal</label>
                  <input
                    type="text"
                    placeholder="Ej: Ruta Villeta - Alberdi Km 14"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">Ciudad</label>
                  <input
                    type="text"
                    placeholder="Ej: Villeta, Villa Hayes, Asunción"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">Notas Comerciales / Condiciones</label>
                <input
                  type="text"
                  placeholder="Ej: Descuento 5% por pago a 15 días, flete incluido"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1.5 text-foreground text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 rounded-lg border border-card-border text-muted-foreground hover:text-foreground text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSupplier}
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingSupplier ? 'Guardando...' : editingSupplier ? 'Actualizar Proveedor' : 'Guardar Proveedor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: VER DETALLE DE COMPRA */}
      {/* ========================================================================= */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-card-border rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Comprobante Interno: {selectedPurchase.purchaseNumber}</h3>
                <p className="text-[11px] text-muted-foreground font-mono">Factura Proveedor: {selectedPurchase.invoiceNumber}</p>
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
                <p className="text-[10px] uppercase font-mono text-muted-foreground">Condición & Liquidación</p>
                <p className="font-bold text-foreground">{selectedPurchase.paymentCondition}</p>
                <p className="text-emerald-400 font-bold font-mono">
                  Total: {formatCurrencyPYG(Number(selectedPurchase.grandTotal))}
                </p>
              </div>
            </div>

            <div className="border border-card-border rounded-lg overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0d121c] text-muted-foreground text-[10px] uppercase">
                  <tr>
                    <th className="py-2 px-3">Artículo</th>
                    <th className="py-2 px-3 text-center">Cantidad</th>
                    <th className="py-2 px-3 text-right">Costo Unit.</th>
                    <th className="py-2 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border text-foreground">
                  {selectedPurchase.items?.map((it: any) => (
                    <tr key={it.id}>
                      <td className="py-2 px-3 font-sans">
                        <span className="font-semibold block">{it.product?.name || 'Material'}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{it.product?.sku}</span>
                      </td>
                      <td className="py-2 px-3 text-center font-bold">{Number(it.quantity)}</td>
                      <td className="py-2 px-3 text-right">{formatCurrencyPYG(Number(it.unitCost))}</td>
                      <td className="py-2 px-3 text-right font-bold">{formatCurrencyPYG(Number(it.subtotal))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedPurchase.notes && (
              <p className="text-xs text-muted-foreground bg-[#0d121c] p-2.5 rounded border border-card-border">
                <strong className="text-foreground">Notas de entrada:</strong> {selectedPurchase.notes}
              </p>
            )}

            <div className="flex justify-end pt-2 border-t border-card-border">
              <button
                type="button"
                onClick={() => setSelectedPurchase(null)}
                className="px-4 py-1.5 rounded-lg bg-[#0d121c] border border-card-border text-xs text-muted-foreground hover:text-foreground"
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

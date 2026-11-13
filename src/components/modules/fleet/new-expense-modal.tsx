'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Fuel,
  Wrench,
  Hammer,
  Disc,
  FileText,
  MoreHorizontal,
  Calendar,
  CheckCircle2,
  DollarSign,
  Building2,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicles: any[];
  preSelectedVehicleId?: string | null;
}

export function NewExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  vehicles,
  preSelectedVehicleId,
}: NewExpenseModalProps) {
  const [vehicleId, setVehicleId] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<'COMBUSTIBLE' | 'MANTENIMIENTO' | 'REPARACION' | 'CUBIERTAS' | 'DOCUMENTACION' | 'VARIOS'>('COMBUSTIBLE');
  const [maintenanceType, setMaintenanceType] = useState<'ACEITE_MOTOR' | 'ACEITE_CAJA_DIFERENCIAL' | 'FILTROS' | 'MANTENIMIENTO_COMPLETO' | 'OTRO'>('ACEITE_MOTOR');
  
  const [description, setDescription] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState('');
  const [supplierOrWorkshop, setSupplierOrWorkshop] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializar fecha y vehículo preseleccionado
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      if (preSelectedVehicleId) {
        setVehicleId(preSelectedVehicleId);
      } else if (vehicles.length > 0 && !vehicleId) {
        setVehicleId(vehicles[0].id);
      }
      setError(null);
    }
  }, [isOpen, preSelectedVehicleId, vehicles]);

  if (!isOpen) return null;

  // Cálculo dinámico del total
  const numParts = Number(partsCost) || 0;
  const numLabor = Number(laborCost) || 0;
  const totalCost = numParts + numLabor;

  // Manejo de cambio en combustible para sugerir total
  const handleLitersChange = (liters: string) => {
    setFuelLiters(liters);
    const l = parseFloat(liters) || 0;
    const p = parseFloat(fuelPricePerLiter) || 0;
    if (l > 0 && p > 0) {
      setPartsCost(Math.round(l * p).toString());
    }
  };

  const handlePricePerLiterChange = (price: string) => {
    setFuelPricePerLiter(price);
    const l = parseFloat(fuelLiters) || 0;
    const p = parseFloat(price) || 0;
    if (l > 0 && p > 0) {
      setPartsCost(Math.round(l * p).toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!vehicleId) {
      setError('Seleccione un vehículo o camión.');
      return;
    }

    if (!description.trim()) {
      setError('La descripción o detalle del trabajo es obligatoria.');
      return;
    }

    if (totalCost <= 0) {
      setError('Debe ingresar un monto en repuestos o mano de obra.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/fleet/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          date,
          category,
          maintenanceType: category === 'MANTENIMIENTO' ? maintenanceType : null,
          description,
          partsCost: numParts,
          laborCost: numLabor,
          totalCost,
          fuelLiters: fuelLiters ? Number(fuelLiters) : null,
          fuelPricePerLiter: fuelPricePerLiter ? Number(fuelPricePerLiter) : null,
          supplierOrWorkshop,
          receiptNumber,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Error al guardar el gasto');
      }

      // Limpiar formulario y cerrar
      setDescription('');
      setPartsCost('');
      setLaborCost('');
      setFuelLiters('');
      setFuelPricePerLiter('');
      setSupplierOrWorkshop('');
      setReceiptNumber('');
      setNotes('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'COMBUSTIBLE', label: 'Combustible', icon: Fuel, color: 'text-amber-400', border: 'border-amber-500/40 bg-amber-500/10' },
    { id: 'MANTENIMIENTO', label: 'Mantenimiento Preventivo', icon: Wrench, color: 'text-blue-400', border: 'border-blue-500/40 bg-blue-500/10' },
    { id: 'REPARACION', label: 'Reparación Mecánica', icon: Hammer, color: 'text-rose-400', border: 'border-rose-500/40 bg-rose-500/10' },
    { id: 'CUBIERTAS', label: 'Cubiertas & Gomería', icon: Disc, color: 'text-emerald-400', border: 'border-emerald-500/40 bg-emerald-500/10' },
    { id: 'DOCUMENTACION', label: 'Documentos / Dinatran', icon: FileText, color: 'text-purple-400', border: 'border-purple-500/40 bg-purple-500/10' },
    { id: 'VARIOS', label: 'Varios / Lavado', icon: MoreHorizontal, color: 'text-slate-400', border: 'border-slate-500/40 bg-slate-500/10' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-card border border-card-border rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between p-4 border-b border-card-border bg-[#0b0e14]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Cargar Gasto / Mantenimiento de Vehículo
              </h3>
              <p className="text-[11px] text-muted-foreground font-mono">
                Control de costos de taller, repuestos y combustible
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-card-border text-muted-foreground hover:bg-muted/20 hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Fila 1: Vehículo y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Vehículo / Camión *
              </label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#0d121c] border border-card-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
              >
                <option value="" className="bg-[#0d121c] text-muted-foreground">Seleccione un camión...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id} className="bg-[#0d121c] text-foreground">
                    {v.code ? `[${v.code}] ` : ''}{v.brand} {v.model} • Chapa: {v.plateNumber}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Fecha del Gasto / Servicio *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#0d121c] border border-card-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary transition-colors font-mono"
              />
            </div>
          </div>

          {/* Fila 2: Categoría de Gasto */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Tipo de Servicio / Gasto *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategory(cat.id as any);
                      if (cat.id === 'COMBUSTIBLE' && !description) {
                        setDescription('Carga de combustible Diesel');
                      }
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all text-left ${
                      isSelected
                        ? `${cat.border} ring-1 ring-primary shadow-sm text-foreground`
                        : 'border-card-border bg-[#0d121c] text-muted-foreground hover:bg-[#131b28] hover:text-foreground'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 flex-shrink-0 ${cat.color}`} />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Si es Mantenimiento Preventivo: Subtipo específico para alertas por fecha */}
          {category === 'MANTENIMIENTO' && (
            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-2">
              <label className="block text-xs font-bold text-blue-400">
                Tipo de Mantenimiento Preventivo (Para control de vencimiento por fecha):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'ACEITE_MOTOR', label: 'Cambio de Aceite de Motor (Cada 6-8 meses)' },
                  { id: 'ACEITE_CAJA_DIFERENCIAL', label: 'Aceite de Caja o Diferencial (Cada 12-18 meses)' },
                  { id: 'FILTROS', label: 'Cambio de Filtros (Aceite / Combustible / Aire)' },
                  { id: 'MANTENIMIENTO_COMPLETO', label: 'Service Completo (Aceite + Filtros + Engrase)' },
                ].map((st) => (
                  <label
                    key={st.id}
                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                      maintenanceType === st.id
                        ? 'bg-blue-500/15 border-blue-400 text-blue-300 font-semibold'
                        : 'bg-card border-card-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <input
                      type="radio"
                      name="maintType"
                      checked={maintenanceType === st.id}
                      onChange={() => setMaintenanceType(st.id as any)}
                      className="accent-primary"
                    />
                    <span className="text-[11px]">{st.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Si es Combustible: Litros y Precio x Litro */}
          {category === 'COMBUSTIBLE' && (
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                  Litros Cargados (opcional):
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ej: 50.0"
                  value={fuelLiters}
                  onChange={(e) => handleLitersChange(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0d121c] border border-card-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                  Precio por Litro Gs. (opcional):
                </label>
                <input
                  type="number"
                  step="10"
                  placeholder="Ej: 8500"
                  value={fuelPricePerLiter}
                  onChange={(e) => handlePricePerLiterChange(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0d121c] border border-card-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
            </div>
          )}

          {/* Fila 3: Detalle / Descripción */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Descripción / Detalle del Trabajo o Repuestos *
            </label>
            <input
              type="text"
              required
              placeholder={
                category === 'COMBUSTIBLE'
                  ? 'Ej: Carga de Diesel común para reparto'
                  : category === 'CUBIERTAS'
                  ? 'Ej: Cubierta, llanta y se le colocó un parche'
                  : category === 'MANTENIMIENTO'
                  ? 'Ej: Compra de filtros y aceite 15w40'
                  : 'Ej: Reparación de elásticos traseros en taller'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#0d121c] border border-card-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Fila 4: Costos Desglosados (Repuestos + Mano de Obra = Total) */}
          <div className="p-3.5 bg-[#0a0f18] border border-card-border rounded-xl space-y-3">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
              Desglose de Costos (Guaraníes)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Repuestos / Insumos:
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={partsCost}
                  onChange={(e) => setPartsCost(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d121c] border border-card-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary font-mono text-right"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Mano de Obra:
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={laborCost}
                  onChange={(e) => setLaborCost(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d121c] border border-card-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary font-mono text-right"
                />
              </div>

              <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2 h-[38px]">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider whitespace-nowrap">
                  Total:
                </span>
                <span className="text-sm sm:text-base font-black text-emerald-400 font-mono tracking-tight whitespace-nowrap">
                  {formatCurrencyPYG(totalCost)}
                </span>
              </div>
            </div>
          </div>

          {/* Fila 5: Proveedor/Taller y N° de Factura/Recibo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Taller Mecánico / Proveedor / Estación:
              </label>
              <input
                type="text"
                placeholder="Ej: Taller Don Ramón / Petropar"
                value={supplierOrWorkshop}
                onChange={(e) => setSupplierOrWorkshop(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d121c] border border-card-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                N° de Comprobante / Factura:
              </label>
              <input
                type="text"
                placeholder="Ej: 001-001-0004521"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d121c] border border-card-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors font-mono"
              />
            </div>
          </div>

          {/* Fila 6: Observaciones extras */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Notas Adicionales (opcional):
            </label>
            <input
              type="text"
              placeholder="Ej: Se guardó factura física en la carpeta de taller"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-[#0d121c] border border-card-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-3 border-t border-card-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-muted/20 hover:bg-muted/30 text-muted-foreground hover:text-foreground rounded-lg text-xs font-medium border border-card-border transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Guardando...' : 'Guardar Registro de Gasto'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}


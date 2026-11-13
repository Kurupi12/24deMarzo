'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  Fuel,
  Wrench,
  Hammer,
  Disc,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Search,
  ArrowUpDown,
} from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';

interface VehicleDetailModalProps {
  vehicle: any | null;
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (vehicleId: string) => void;
  onRefresh: () => void;
}

export function VehicleDetailModal({
  vehicle,
  isOpen,
  onClose,
  onAddExpense,
  onRefresh,
}: VehicleDetailModalProps) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchExpenses = async () => {
    if (!vehicle) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/fleet/expenses?vehicleId=${vehicle.id}`);
      const json = await res.json();
      if (json.success) {
        setExpenses(json.data.expenses || []);
      }
    } catch (err) {
      console.error('Error fetching vehicle expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && vehicle) {
      fetchExpenses();
      setSearchTerm('');
    }
  }, [isOpen, vehicle]);

  if (!isOpen || !vehicle) return null;

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este registro de gasto?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/v1/fleet/expenses/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        onRefresh();
      }
    } catch (err) {
      console.error('Error deleting expense:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      e.description?.toLowerCase().includes(s) ||
      e.supplierOrWorkshop?.toLowerCase().includes(s) ||
      e.category?.toLowerCase().includes(s) ||
      e.receiptNumber?.toLowerCase().includes(s)
    );
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'COMBUSTIBLE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Fuel className="w-3 h-3" /> Combustible
          </span>
        );
      case 'MANTENIMIENTO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Wrench className="w-3 h-3" /> Mantenimiento
          </span>
        );
      case 'REPARACION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Hammer className="w-3 h-3" /> Reparación
          </span>
        );
      case 'CUBIERTAS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Disc className="w-3 h-3" /> Cubiertas
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <FileText className="w-3 h-3" /> {cat}
          </span>
        );
    }
  };

  const maintDates = vehicle.maintenanceDates || {};

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-card border border-card-border rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Cabecera del Camión */}
        <div className="flex items-center justify-between p-4 border-b border-card-border bg-[#0b0e14]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-primary/20 text-primary font-mono font-bold text-xs">
                  {vehicle.code || 'CAM'}
                </span>
                <h3 className="text-base font-bold text-foreground">
                  {vehicle.brand} {vehicle.model}
                </h3>
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                Chapa: <strong className="text-foreground">{vehicle.plateNumber}</strong>
                {vehicle.capacityTons ? ` &bull; Capacidad: ${vehicle.capacityTons} Tn.` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onAddExpense(vehicle.id);
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Cargar Gasto</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-card-border text-muted-foreground hover:bg-muted/20 hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Semáforo de Mantenimiento Preventivo (Estimación por Tiempo / Fechas) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-[#0a0e17] border-b border-card-border">
          {/* Alerta Aceite de Motor */}
          <div className="p-3 rounded-lg border border-card-border bg-card/60 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 mt-0.5">
              <Wrench className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Aceite de Motor & Filtros</span>
                {maintDates.motorOilStatus === 'OK' ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Al Día
                  </span>
                ) : maintDates.motorOilStatus === 'REVISION_SUGERIDA' ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Clock className="w-3 h-3" /> Revisar ({maintDates.motorOilMonths} meses)
                  </span>
                ) : maintDates.motorOilStatus === 'VENCIDO' ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <AlertTriangle className="w-3 h-3" /> Vencido ({maintDates.motorOilMonths} meses)
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground font-mono">Sin registros</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Último cambio:{' '}
                <strong className="text-foreground">
                  {maintDates.lastMotorOilChange
                    ? new Date(maintDates.lastMotorOilChange).toLocaleDateString('es-PY')
                    : 'Sin registro previo'}
                </strong>{' '}
                {maintDates.motorOilMonths !== null && `(hace ${maintDates.motorOilMonths} meses)`}
              </p>
            </div>
          </div>

          {/* Alerta Aceite de Caja y Diferencial */}
          <div className="p-3 rounded-lg border border-card-border bg-card/60 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 mt-0.5">
              <Disc className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Aceite de Caja & Diferencial</span>
                {maintDates.gearboxOilStatus === 'OK' ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Al Día
                  </span>
                ) : maintDates.gearboxOilStatus === 'REVISION_SUGERIDA' ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Clock className="w-3 h-3" /> Revisar ({maintDates.gearboxOilMonths} meses)
                  </span>
                ) : maintDates.gearboxOilStatus === 'VENCIDO' ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <AlertTriangle className="w-3 h-3" /> Vencido ({maintDates.gearboxOilMonths} meses)
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground font-mono">Sin registros</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Último cambio:{' '}
                <strong className="text-foreground">
                  {maintDates.lastGearboxOilChange
                    ? new Date(maintDates.lastGearboxOilChange).toLocaleDateString('es-PY')
                    : 'Sin registro previo'}
                </strong>{' '}
                {maintDates.gearboxOilMonths !== null && `(hace ${maintDates.gearboxOilMonths} meses)`}
              </p>
            </div>
          </div>
        </div>

        {/* Filtro y Buscador de Gastos/Repuestos */}
        <div className="p-3 bg-[#0d121c] border-b border-card-border flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar en historial: ej. filtro, aceite, taller..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#0d121c] border border-card-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary font-sans"
            />
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {filteredExpenses.length} registro(s) encontrado(s)
          </div>
        </div>

        {/* Tabla de Historial */}
        <div className="p-4 flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground text-xs font-mono">
              Cargando historial de gastos...
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs space-y-1">
              <p className="font-semibold text-foreground">No se encontraron registros de gastos.</p>
              <p className="text-[11px]">Utilice el botón "+ Cargar Gasto" para registrar servicios, combustible o repuestos.</p>
            </div>
          ) : (
            <div className="border border-card-border rounded-lg overflow-hidden">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-card-border bg-[#0b0e14] text-[11px] font-bold text-muted-foreground uppercase font-mono">
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Categoría</th>
                    <th className="py-2.5 px-3">Detalle / Trabajo Realizado</th>
                    <th className="py-2.5 px-3">Taller / Proveedor</th>
                    <th className="py-2.5 px-3 text-right">Repuestos</th>
                    <th className="py-2.5 px-3 text-right">M. Obra</th>
                    <th className="py-2.5 px-3 text-right">Total Gs.</th>
                    <th className="py-2.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border bg-card">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(exp.date).toLocaleDateString('es-PY')}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {getCategoryBadge(exp.category)}
                      </td>
                      <td className="py-2 px-3 font-medium text-foreground">
                        <div>{exp.description}</div>
                        {exp.category === 'COMBUSTIBLE' && exp.fuelLiters && (
                          <div className="text-[10px] text-amber-400 font-mono">
                            {Number(exp.fuelLiters)} Lts.{exp.fuelPricePerLiter ? ` @ ${formatCurrencyPYG(Number(exp.fuelPricePerLiter))}/L` : ''}
                          </div>
                        )}
                        {exp.receiptNumber && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            Comprobante: {exp.receiptNumber}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-[11px]">
                        {exp.supplierOrWorkshop || '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-muted-foreground text-[11px]">
                        {Number(exp.partsCost) > 0 ? formatCurrencyPYG(Number(exp.partsCost)) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-muted-foreground text-[11px]">
                        {Number(exp.laborCost) > 0 ? formatCurrencyPYG(Number(exp.laborCost)) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                        {formatCurrencyPYG(Number(exp.totalCost))}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          disabled={deletingId === exp.id}
                          onClick={() => handleDeleteExpense(exp.id)}
                          title="Eliminar registro"
                          className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}


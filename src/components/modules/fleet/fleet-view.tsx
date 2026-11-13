'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Wrench,
  Fuel,
  Hammer,
  Disc,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Trash2,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { useCustomDialog } from '@/components/common/custom-dialog-provider';
import { NewExpenseModal } from './new-expense-modal';
import { VehicleDetailModal } from './vehicle-detail-modal';
import { NewVehicleModal } from './new-vehicle-modal';

export function FleetView() {
  const { confirm, alert } = useCustomDialog();
  const [activeTab, setActiveTab] = useState<'vehicles' | 'history' | 'preventive'>('vehicles');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [globalTotals, setGlobalTotals] = useState<any>({});
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expensesSummary, setExpensesSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Filtros del historial
  const [filterVehicleId, setFilterVehicleId] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Modales
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedVehicleForExpense, setSelectedVehicleForExpense] = useState<string | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedVehicleForDetail, setSelectedVehicleForDetail] = useState<any | null>(null);

  const [isNewVehicleModalOpen, setIsNewVehicleModalOpen] = useState(false);

  // Cargar resumen de flota
  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/v1/fleet/summary');
      const json = await res.json();
      if (json.success) {
        setVehicles(json.data.vehicles || []);
        setGlobalTotals(json.data.globalTotals || {});
      }
    } catch (err) {
      console.error('Error fetching fleet summary:', err);
    }
  };

  // Cargar historial general de gastos
  const fetchExpenses = async () => {
    try {
      const params = new URLSearchParams();
      if (filterVehicleId) params.append('vehicleId', filterVehicleId);
      if (filterCategory) params.append('category', filterCategory);
      if (filterSearch) params.append('search', filterSearch);
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);

      const res = await fetch(`/api/v1/fleet/expenses?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setExpenses(json.data.expenses || []);
        setExpensesSummary(json.data.summary || {});
      }
    } catch (err) {
      console.error('Error fetching fleet expenses:', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([fetchSummary(), fetchExpenses()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchExpenses();
    }
  }, [filterVehicleId, filterCategory, filterSearch, filterStartDate, filterEndDate, activeTab]);

  const handleDeleteExpense = async (id: string) => {
    const ok = await confirm({
      title: 'Eliminar Registro de Gasto',
      message: '¿Está seguro de que desea eliminar este registro de gasto / mantenimiento? Esta acción no se puede deshacer.',
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/v1/fleet/expenses/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchExpenses();
        fetchSummary();
      } else {
        await alert({
          title: 'Error',
          message: json.error?.message || 'Error al eliminar el gasto',
          variant: 'danger',
        });
      }
    } catch (err) {
      console.error('Error deleting expense:', err);
      await alert({
        title: 'Error de Red',
        message: 'No se pudo conectar con el servidor',
        variant: 'danger',
      });
    }
  };

  const handleDeleteVehicle = async (v: any) => {
    const ok = await confirm({
      title: 'Eliminar Camión de la Flota',
      message: `¿Está seguro de que desea eliminar el vehículo ${v.brand} ${v.model} (Chapa: ${v.plateNumber}) de la flota?\n\nEsta acción lo quitará del inventario activo y de los selectores de carga.`,
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/v1/logistics/vehicles?id=${v.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        await alert({
          title: 'Vehículo Eliminado',
          message: `El vehículo ${v.brand} ${v.model} (${v.plateNumber}) fue eliminado correctamente.`,
          variant: 'success',
        });
        loadAllData();
      } else {
        await alert({
          title: 'Error al Eliminar',
          message: json.error?.message || 'No se pudo eliminar el vehículo',
          variant: 'danger',
        });
      }
    } catch (err: any) {
      console.error('Error deleting vehicle:', err);
      await alert({
        title: 'Error de Red',
        message: 'No se pudo conectar con el servidor para eliminar el vehículo',
        variant: 'danger',
      });
    }
  };

  const openNewExpenseForVehicle = (vehicleId: string) => {
    setSelectedVehicleForExpense(vehicleId);
    setIsExpenseModalOpen(true);
  };

  const openVehicleDetail = (vehicle: any) => {
    setSelectedVehicleForDetail(vehicle);
    setIsDetailModalOpen(true);
  };

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

  return (
    <div className="space-y-6">
      
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Control de Flota, Camiones & Gastos
            </h1>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              Mantenimientos periódicos por fecha, combustible y costos de taller
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadAllData()}
            className="p-2 bg-card hover:bg-muted/20 border border-card-border text-muted-foreground hover:text-foreground rounded-lg transition-colors"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsNewVehicleModalOpen(true)}
            className="px-3.5 py-2 bg-card hover:bg-muted/20 border border-card-border text-foreground rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-primary" />
            <span>+ Nuevo Vehículo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedVehicleForExpense(null);
              setIsExpenseModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Cargar Gasto / Mantenimiento</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen Global de Gastos de Flota */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Mes */}
        <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase font-mono tracking-wider">
              Gastos Este Mes
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono mt-2">
            {formatCurrencyPYG(globalTotals.totalMonth || 0)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Combustible + talleres de la flota
          </p>
        </div>

        {/* Total Combustible Histórico */}
        <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase font-mono tracking-wider">
              Total Combustible
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-400 font-mono mt-2">
            {formatCurrencyPYG(globalTotals.totalFuel || 0)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Cargas de Diesel / Nafta acumuladas
          </p>
        </div>

        {/* Total Mantenimiento Preventivo */}
        <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase font-mono tracking-wider">
              Total Mantenimientos
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-blue-400 font-mono mt-2">
            {formatCurrencyPYG(globalTotals.totalMaintenance || 0)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Aceites, filtros y services preventivos
          </p>
        </div>

        {/* Total Reparaciones y Cubiertas */}
        <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase font-mono tracking-wider">
              Reparaciones & Gomería
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Hammer className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-rose-400 font-mono mt-2">
            {formatCurrencyPYG((globalTotals.totalRepairs || 0) + (globalTotals.totalTires || 0))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Repuestos mecánicos, parches y recapes
          </p>
        </div>
      </div>

      {/* Pestañas de Navegación del Módulo */}
      <div className="flex items-center gap-2 border-b border-card-border pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('vehicles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'vehicles'
              ? 'bg-primary text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Fichas de Camiones ({vehicles.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-primary text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Historial General de Gastos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preventive')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'preventive'
              ? 'bg-primary text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Alertas Preventivas por Fecha</span>
        </button>
      </div>

      {/* CONTENIDO PESTAÑA 1: FICHAS DE CAMIONES */}
      {activeTab === 'vehicles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => {
            const maint = v.maintenanceDates || {};
            return (
              <div
                key={v.id}
                className="bg-card border border-card-border rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-primary/40 transition-colors space-y-4"
              >
                {/* Cabecera del Camión */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary mt-0.5">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary font-mono font-bold text-[10px]">
                          {v.code || 'CAM'}
                        </span>
                        <h3 className="text-sm font-bold text-foreground">
                          {v.brand} {v.model}
                        </h3>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">
                        Chapa: <strong className="text-foreground">{v.plateNumber}</strong>
                        {v.capacityTons ? ` • ${v.capacityTons} Tn` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Botón para eliminar camión de la flota */}
                  <button
                    type="button"
                    onClick={() => handleDeleteVehicle(v)}
                    title="Eliminar este camión de la flota"
                    className="p-1.5 rounded-lg border border-card-border text-muted-foreground hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Resumen de Costos del Camión */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-[#0a0f18] border border-card-border font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Gastos Este Mes:</span>
                    <strong className="text-emerald-400 font-bold">
                      {formatCurrencyPYG(v.totalCurrentMonth)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Gasto Total Acum.:</span>
                    <strong className="text-foreground font-bold">
                      {formatCurrencyPYG(v.totalAllTime)}
                    </strong>
                  </div>
                </div>

                {/* Semáforo Preventivo por Fecha */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Aceite Motor & Filtros:</span>
                    {maint.motorOilStatus === 'OK' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Al Día
                      </span>
                    ) : maint.motorOilStatus === 'REVISION_SUGERIDA' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock className="w-2.5 h-2.5" /> Revisar ({maint.motorOilMonths}m)
                      </span>
                    ) : maint.motorOilStatus === 'VENCIDO' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <AlertTriangle className="w-2.5 h-2.5" /> Vencido ({maint.motorOilMonths}m)
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Sin datos</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Aceite Caja / Diferencial:</span>
                    {maint.gearboxOilStatus === 'OK' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Al Día
                      </span>
                    ) : maint.gearboxOilStatus === 'REVISION_SUGERIDA' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock className="w-2.5 h-2.5" /> Revisar ({maint.gearboxOilMonths}m)
                      </span>
                    ) : maint.gearboxOilStatus === 'VENCIDO' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <AlertTriangle className="w-2.5 h-2.5" /> Vencido ({maint.gearboxOilMonths}m)
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Sin datos</span>
                    )}
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-card-border">
                  <button
                    type="button"
                    onClick={() => openNewExpenseForVehicle(v.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cargar Gasto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openVehicleDetail(v)}
                    className="px-3 py-1.5 bg-card hover:bg-muted/20 border border-card-border text-foreground rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-primary" />
                    <span>Ver Historial</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CONTENIDO PESTAÑA 2: HISTORIAL GENERAL DE GASTOS */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="p-4 bg-card border border-card-border rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Buscador */}
              <div className="lg:col-span-2 relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar repuestos, taller, comprobante..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-[#0d121c] border border-card-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
                />
              </div>

              {/* Filtro por Vehículo */}
              <div>
                <select
                  value={filterVehicleId}
                  onChange={(e) => setFilterVehicleId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d121c] border border-card-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="" className="bg-[#0d121c] text-muted-foreground">Todos los vehículos</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id} className="bg-[#0d121c] text-foreground">
                      {v.code ? `[${v.code}] ` : ''}{v.brand} {v.model} ({v.plateNumber})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Categoría */}
              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d121c] border border-card-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="" className="bg-[#0d121c] text-muted-foreground">Todas las categorías</option>
                  <option value="COMBUSTIBLE" className="bg-[#0d121c] text-foreground">Combustible</option>
                  <option value="MANTENIMIENTO" className="bg-[#0d121c] text-foreground">Mantenimiento Preventivo</option>
                  <option value="REPARACION" className="bg-[#0d121c] text-foreground">Reparación Mecánica</option>
                  <option value="CUBIERTAS" className="bg-[#0d121c] text-foreground">Cubiertas & Gomería</option>
                  <option value="DOCUMENTACION" className="bg-[#0d121c] text-foreground">Documentos / Dinatran</option>
                  <option value="VARIOS" className="bg-[#0d121c] text-foreground">Varios / Lavado</option>
                </select>
              </div>

              {/* Limpiar Filtros */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    setFilterSearch('');
                    setFilterVehicleId('');
                    setFilterCategory('');
                    setFilterStartDate('');
                    setFilterEndDate('');
                  }}
                  className="w-full px-3 py-2 bg-muted/20 hover:bg-muted/30 border border-card-border rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Limpiar Filtros
                </button>
              </div>
            </div>

            {/* Resumen numérico del filtro actual */}
            <div className="pt-2 border-t border-card-border flex flex-wrap items-center justify-between text-xs font-mono text-muted-foreground gap-2">
              <div>
                Registros: <strong className="text-foreground">{expensesSummary.count || 0}</strong>
              </div>
              <div className="flex items-center gap-4">
                <span>Repuestos: <strong className="text-foreground">{formatCurrencyPYG(expensesSummary.totalParts || 0)}</strong></span>
                <span>Mano de Obra: <strong className="text-foreground">{formatCurrencyPYG(expensesSummary.totalLabor || 0)}</strong></span>
                <span className="text-emerald-400 font-bold">Total Filtrado: {formatCurrencyPYG(expensesSummary.totalExpenses || 0)}</span>
              </div>
            </div>
          </div>

          {/* Tabla de Gastos */}
          <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-card-border bg-[#0b0e14] text-[11px] font-bold text-muted-foreground uppercase font-mono">
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Camión / Vehículo</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4">Detalle / Trabajo</th>
                    <th className="py-3 px-4">Taller / Proveedor</th>
                    <th className="py-3 px-4 text-right">Repuestos</th>
                    <th className="py-3 px-4 text-right">M. Obra</th>
                    <th className="py-3 px-4 text-right">Total Gs.</th>
                    <th className="py-3 px-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-muted-foreground">
                        No se encontraron registros de gastos con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {new Date(exp.date).toLocaleDateString('es-PY')}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-foreground">
                            {exp.vehicle?.brand} {exp.vehicle?.model}
                          </div>
                          <div className="text-[10px] font-mono text-primary font-bold">
                            {exp.vehicle?.plateNumber} {exp.vehicle?.code ? `(${exp.vehicle?.code})` : ''}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {getCategoryBadge(exp.category)}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-medium text-foreground">{exp.description}</div>
                          {exp.category === 'COMBUSTIBLE' && exp.fuelLiters && (
                            <div className="text-[10px] text-amber-400 font-mono">
                              {Number(exp.fuelLiters)} Lts.{exp.fuelPricePerLiter ? ` @ ${formatCurrencyPYG(Number(exp.fuelPricePerLiter))}/L` : ''}
                            </div>
                          )}
                          {exp.receiptNumber && (
                            <div className="text-[10px] text-muted-foreground font-mono">
                              Comp.: {exp.receiptNumber}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground text-[11px]">
                          {exp.supplierOrWorkshop || '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-muted-foreground text-[11px]">
                          {Number(exp.partsCost) > 0 ? formatCurrencyPYG(Number(exp.partsCost)) : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-muted-foreground text-[11px]">
                          {Number(exp.laborCost) > 0 ? formatCurrencyPYG(Number(exp.laborCost)) : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400">
                          {formatCurrencyPYG(Number(exp.totalCost))}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp.id)}
                            title="Eliminar gasto"
                            className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
          </div>
        </div>
      )}

      {/* CONTENIDO PESTAÑA 3: ALERTAS PREVENTIVAS POR FECHA */}
      {activeTab === 'preventive' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#0a0f18] border border-card-border rounded-xl text-xs space-y-1">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>Control Preventivo por Estimación de Fechas (Para Vehículos sin Odómetro)</span>
            </h3>
            <p className="text-muted-foreground">
              Como la flota de reparto no cuenta con medidor de kilometraje en funcionamiento, el sistema calcula los <strong>meses transcurridos</strong> desde la última fecha de servicio registrada para prevenir roturas en motor, cajas y diferenciales.
            </p>
          </div>

          <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-card-border bg-[#0b0e14] text-[11px] font-bold text-muted-foreground uppercase font-mono">
                    <th className="py-3 px-4">Vehículo</th>
                    <th className="py-3 px-4">Chapa</th>
                    <th className="py-3 px-4">Último Aceite de Motor</th>
                    <th className="py-3 px-4">Estado Motor (Meta: 6 a 8 meses)</th>
                    <th className="py-3 px-4">Último Aceite Caja / Diferencial</th>
                    <th className="py-3 px-4">Estado Caja (Meta: 12 a 18 meses)</th>
                    <th className="py-3 px-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {vehicles.map((v) => {
                    const m = v.maintenanceDates || {};
                    return (
                      <tr key={v.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground">
                          {v.brand} {v.model}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-primary">
                          {v.plateNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {m.lastMotorOilChange ? (
                            <div>
                              <div>{new Date(m.lastMotorOilChange).toLocaleDateString('es-PY')}</div>
                              <span className="text-[10px] text-muted-foreground">Hace {m.motorOilMonths} meses</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Sin registros</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {m.motorOilStatus === 'OK' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Al Día ({m.motorOilMonths}m)
                            </span>
                          ) : m.motorOilStatus === 'REVISION_SUGERIDA' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Clock className="w-3 h-3" /> Sugerido Revisar ({m.motorOilMonths}m)
                            </span>
                          ) : m.motorOilStatus === 'VENCIDO' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <AlertTriangle className="w-3 h-3" /> Mantenimiento Vencido ({m.motorOilMonths}m)
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">Sin historial</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {m.lastGearboxOilChange ? (
                            <div>
                              <div>{new Date(m.lastGearboxOilChange).toLocaleDateString('es-PY')}</div>
                              <span className="text-[10px] text-muted-foreground">Hace {m.gearboxOilMonths} meses</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Sin registros</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {m.gearboxOilStatus === 'OK' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Al Día ({m.gearboxOilMonths}m)
                            </span>
                          ) : m.gearboxOilStatus === 'REVISION_SUGERIDA' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Clock className="w-3 h-3" /> Inspección Sugerida ({m.gearboxOilMonths}m)
                            </span>
                          ) : m.gearboxOilStatus === 'VENCIDO' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <AlertTriangle className="w-3 h-3" /> Cambio Recomendado ({m.gearboxOilMonths}m)
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">Sin historial</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => openNewExpenseForVehicle(v.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow transition-colors"
                          >
                            + Cargar Service
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Cargar Nuevo Gasto / Mantenimiento */}
      <NewExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={() => {
          fetchSummary();
          fetchExpenses();
        }}
        vehicles={vehicles}
        preSelectedVehicleId={selectedVehicleForExpense}
      />

      {/* MODAL 2: Ficha y Detalle de un Camión */}
      <VehicleDetailModal
        vehicle={selectedVehicleForDetail}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onAddExpense={(vId) => openNewExpenseForVehicle(vId)}
        onRefresh={() => {
          fetchSummary();
          fetchExpenses();
        }}
      />

      {/* MODAL 3: Registrar Nuevo Vehículo */}
      <NewVehicleModal
        isOpen={isNewVehicleModalOpen}
        onClose={() => setIsNewVehicleModalOpen(false)}
        onSuccess={() => {
          fetchSummary();
        }}
      />

    </div>
  );
}


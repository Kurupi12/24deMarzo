'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  X,
  Search,
  Scale,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useCustomDialog } from '@/components/common/custom-dialog-provider';

export function VehiclesManager() {
  const { confirm: customConfirm, alert: customAlert } = useCustomDialog();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal para Crear / Editar
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);

  const [code, setCode] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [capacityTons, setCapacityTons] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/logistics/vehicles');
      const json = await res.json();
      if (json.success) {
        setVehicles(json.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const openCreateModal = () => {
    setEditingVehicle(null);
    setCode('');
    setPlateNumber('');
    setBrand('');
    setModel('');
    setCapacityTons('');
    setNotes('');
    setShowModal(true);
  };

  const openEditModal = (v: any) => {
    setEditingVehicle(v);
    setCode(v.code || '');
    setPlateNumber(v.plateNumber || '');
    setBrand(v.brand || '');
    setModel(v.model || '');
    setCapacityTons(v.capacityTons ? v.capacityTons.toString() : '');
    setNotes(v.notes || '');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isEdit = Boolean(editingVehicle);
      const url = '/api/v1/logistics/vehicles';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        id: editingVehicle?.id,
        code: code.trim(),
        plateNumber: plateNumber.trim(),
        brand: brand.trim(),
        model: model.trim(),
        capacityTons: capacityTons ? Number(capacityTons) : null,
        notes: notes.trim(),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchVehicles();
      } else {
        customAlert({
          title: 'Error de Vehículo',
          message: data.error?.message || 'Error al guardar el vehículo',
          variant: 'danger',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, plate: string) => {
    const ok = await customConfirm({
      title: 'Dar de Baja Vehículo',
      message: `¿Desea dar de baja el vehículo con chapa ${plate}?`,
      confirmText: 'Dar de Baja',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/v1/logistics/vehicles?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchVehicles();
      } else {
        customAlert({
          title: 'Error',
          message: data.error?.message || 'Error al eliminar vehículo',
          variant: 'danger',
        });
      }
    } catch (e: any) {
      customAlert({
        title: 'Error de Red',
        message: e.message,
        variant: 'danger',
      });
    }
  };

  const filtered = vehicles.filter((v) => {
    const q = searchTerm.toLowerCase();
    return (
      (v.code && v.code.toLowerCase().includes(q)) ||
      (v.plateNumber && v.plateNumber.toLowerCase().includes(q)) ||
      (v.brand && v.brand.toLowerCase().includes(q)) ||
      (v.model && v.model.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-card-border p-5 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
              Administración de Flota de Vehículos & Camiones
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Registro, edición y control de camiones de reparto para asignación directa en el punto de venta y despacho de obras.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Nuevo Camión</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-card border border-card-border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código (CAM-01), chapa, marca o modelo..."
            className="w-full bg-[#0d121c] border border-card-border rounded-lg pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono"
          />
        </div>
        <div className="text-xs font-mono text-muted-foreground whitespace-nowrap">
          Vehículos activos: <strong className="text-foreground">{filtered.length}</strong>
        </div>
      </div>

      {/* Tabla de Vehículos */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-mono">
            Consultando flota de camiones en Neon Postgres...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-xs text-muted-foreground">
            <Truck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-foreground font-medium">No se encontraron vehículos.</p>
            <p className="text-[11px] text-muted-foreground mt-1">Haga clic en &quot;Registrar Nuevo Camión&quot; para agregar a la flota.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0d121c] border-b border-card-border text-[11px] font-mono uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Chapa Oficial</th>
                  <th className="py-3 px-4">Marca y Modelo</th>
                  <th className="py-3 px-4 text-center">Capacidad Máx.</th>
                  <th className="py-3 px-4">Observaciones / Tipo</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border font-mono text-muted-foreground">
                {filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-bold text-foreground">{v.code || '-'}</td>
                    <td className="py-3 px-4 text-accent font-bold font-mono text-sm">{v.plateNumber}</td>
                    <td className="py-3 px-4 font-sans">
                      <span className="font-semibold text-foreground">{v.brand}</span>{' '}
                      <span className="text-muted-foreground">{v.model}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-foreground">
                      {v.capacityTons ? `${v.capacityTons} Tn` : '-'}
                    </td>
                    <td className="py-3 px-4 font-sans text-[11px] text-muted-foreground truncate max-w-xs">
                      {v.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Operativo
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(v)}
                          title="Editar vehículo"
                          className="p-1.5 rounded bg-[#0d121c] border border-card-border hover:border-primary text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(v.id, v.plateNumber)}
                          title="Dar de baja vehículo"
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

      {/* Modal: Crear / Editar Vehículo */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-card-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-card-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  {editingVehicle ? 'Editar Vehículo de Flota' : 'Registrar Nuevo Vehículo'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">Código Interno</label>
                  <input
                    type="text"
                    placeholder="Ej: CAM-05"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary uppercase text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">Chapa Oficial *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: ABC 123"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1.5 font-mono font-bold text-foreground focus:outline-none focus:border-primary uppercase text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">Marca *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Scania, Mercedes..."
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">Modelo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 113H, K2700..."
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">Capacidad de Carga (Toneladas)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Ej: 15"
                  value={capacityTons}
                  onChange={(e) => setCapacityTons(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted-foreground mb-1">Notas / Uso Asignado</label>
                <input
                  type="text"
                  placeholder="Ej: Volquete para fletes de arena y ripio"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#0d121c] border border-card-border rounded-md px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 rounded-md border border-card-border text-muted-foreground hover:bg-muted/20"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white font-semibold flex items-center gap-1.5 shadow-md"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{saving ? 'Guardando...' : 'Guardar Vehículo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


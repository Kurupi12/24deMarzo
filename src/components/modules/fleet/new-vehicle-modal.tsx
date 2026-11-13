'use client';

import React, { useState } from 'react';
import { X, Truck, CheckCircle2 } from 'lucide-react';

interface NewVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewVehicleModal({ isOpen, onClose, onSuccess }: NewVehicleModalProps) {
  const [code, setCode] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [capacityTons, setCapacityTons] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!plateNumber.trim() || !brand.trim() || !model.trim()) {
      setError('La chapa, marca y modelo son campos obligatorios.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/logistics/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim() || undefined,
          plateNumber: plateNumber.trim().toUpperCase(),
          brand: brand.trim(),
          model: model.trim(),
          capacityTons: capacityTons ? parseFloat(capacityTons) : null,
          notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Error al registrar el camión');
      }

      setCode('');
      setPlateNumber('');
      setBrand('');
      setModel('');
      setCapacityTons('');
      setNotes('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-card border border-card-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex items-center justify-between p-4 border-b border-card-border bg-[#0b0e14]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Registrar Nuevo Vehículo / Camión
              </h3>
              <p className="text-[11px] text-muted-foreground font-mono">
                Incorporación de unidad a la flota de reparto
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Chapa / Matrícula *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: ABC-123"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-input-bg border border-card-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary font-mono font-bold uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Código Interno (opcional):
              </label>
              <input
                type="text"
                placeholder="Ej: CAM-04 / FUR-02"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-input-bg border border-card-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Marca *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Scania, Mercedes-Benz, Kia"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 bg-input-bg border border-card-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Modelo / Tipo *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: 113H Volquete, K2700"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 bg-input-bg border border-card-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Capacidad de Carga en Toneladas (opcional):
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="Ej: 15.0"
              value={capacityTons}
              onChange={(e) => setCapacityTons(e.target.value)}
              className="w-full px-3 py-2 bg-input-bg border border-card-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Observaciones / Finalidad:
            </label>
            <input
              type="text"
              placeholder="Ej: Camión pesado para fletes de arena y triturada"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-input-bg border border-card-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

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
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Registrando...' : 'Registrar Vehículo'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}


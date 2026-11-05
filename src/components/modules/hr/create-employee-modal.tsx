'use client';

import React, { useState } from 'react';
import { X, UserPlus, Users } from 'lucide-react';

interface CreateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmployeeCreated: () => void;
}

export function CreateEmployeeModal({ isOpen, onClose, onEmployeeCreated }: CreateEmployeeModalProps) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    documentNumber: '',
    jobTitle: 'Operario de Depósito',
    department: 'Operaciones',
    phone: '',
    weeklySalary: '700000',
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/v1/hr/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          documentNumber: form.documentNumber.trim(),
          jobTitle: form.jobTitle.trim(),
          department: form.department.trim(),
          phone: form.phone.trim() || null,
          weeklySalary: parseFloat(form.weeklySalary) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onEmployeeCreated();
        onClose();
      } else {
        alert(data.error?.message || 'Error al crear empleado');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-card border border-card-border rounded-lg w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-card-border pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Alta de Nuevo Funcionario</h3>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 font-sans text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Nombre *</label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                placeholder="Ej: Marcelo"
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Apellido *</label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="Ej: Benítez"
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Cédula de Identidad *</label>
              <input
                type="text"
                required
                value={form.documentNumber}
                onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
                placeholder="Ej: 4.567.890"
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Teléfono / WhatsApp</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Ej: (0981) 123-456"
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Cargo *</label>
              <input
                type="text"
                required
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Salario Semanal (₲) *</label>
              <input
                type="number"
                required
                min="100000"
                step="10000"
                value={form.weeklySalary}
                onChange={(e) => setForm({ ...form, weeklySalary: e.target.value })}
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-card-border">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md border border-card-border text-xs text-muted-foreground hover:text-foreground">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-3 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-medium disabled:opacity-50">
              {loading ? 'Guardando...' : 'Registrar Funcionario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


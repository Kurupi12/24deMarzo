'use client';

import React, { useState, useEffect } from 'react';
import { X, UserCheck, Shield, AlertCircle, Save, Phone, DollarSign, Briefcase, Hash } from 'lucide-react';
import { useCustomDialog } from '@/components/common/custom-dialog-provider';

interface EmployeeToEdit {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  jobTitle: string;
  department: string;
  phone: string | null;
  status?: string;
  salaryStructure: {
    weeklySalary: string | number;
  } | null;
}

interface EditEmployeeModalProps {
  employee: EmployeeToEdit | null;
  isOpen: boolean;
  onClose: () => void;
  onEmployeeUpdated: () => void;
}

export function EditEmployeeModal({ employee, isOpen, onClose, onEmployeeUpdated }: EditEmployeeModalProps) {
  const { alert: customAlert } = useCustomDialog();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    documentNumber: '',
    jobTitle: '',
    department: 'Operaciones',
    phone: '',
    weeklySalary: '700000',
    status: 'ACTIVE',
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (employee) {
      setForm({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        documentNumber: employee.documentNumber || '',
        jobTitle: employee.jobTitle || 'Operario de Depósito',
        department: employee.department || 'Operaciones',
        phone: employee.phone || '',
        weeklySalary: String(employee.salaryStructure?.weeklySalary || 700000),
        status: employee.status || 'ACTIVE',
      });
      setErrorMsg('');
    }
  }, [employee]);

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/v1/hr/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          documentNumber: form.documentNumber.trim(),
          jobTitle: form.jobTitle.trim(),
          department: form.department.trim(),
          phone: form.phone.trim() || null,
          weeklySalary: parseFloat(form.weeklySalary) || 0,
          status: form.status,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onEmployeeUpdated();
        onClose();
      } else {
        setErrorMsg(data.error?.message || 'Error al actualizar datos del funcionario');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-card border border-card-border rounded-xl w-full max-w-lg p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b border-card-border pb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Editar Datos del Funcionario</h3>
              <p className="text-[11px] text-muted-foreground font-mono">Legajo Oficial: <span className="text-sky-400 font-semibold">{employee.code}</span></p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 font-sans text-xs">
          
          {/* Nombres y Apellidos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Nombre *</label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Apellido *</label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          {/* Cédula y Teléfono */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Cédula de Identidad *</label>
              <input
                type="text"
                required
                value={form.documentNumber}
                onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground focus:outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Teléfono / WhatsApp</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Ej: (0981) 123-456"
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono text-foreground focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          {/* Cargo y Departamento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Cargo *</label>
              <input
                type="text"
                required
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Departamento</label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:border-sky-400 font-sans"
              >
                <option value="Operaciones">Operaciones / Depósito</option>
                <option value="Logística">Logística & Choferes</option>
                <option value="Administración">Administración & Ventas</option>
                <option value="Mantenimiento">Mantenimiento</option>
              </select>
            </div>
          </div>

          {/* Salario Semanal y Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Salario Semanal (₲) *</label>
              <input
                type="number"
                required
                min="100000"
                step="10000"
                value={form.weeklySalary}
                onChange={(e) => setForm({ ...form, weeklySalary: e.target.value })}
                onFocus={(e) => e.target.select()}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 font-mono font-bold text-emerald-400 focus:outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground mb-1">Estado Laboral</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:border-sky-400 font-sans"
              >
                <option value="ACTIVE">Activo en Plantilla</option>
                <option value="INACTIVE">Inactivo / Reposo</option>
                <option value="SUSPENDED">Suspendido</option>
                <option value="TERMINATED">Desvinculado / Baja</option>
              </select>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-card-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-card-border text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

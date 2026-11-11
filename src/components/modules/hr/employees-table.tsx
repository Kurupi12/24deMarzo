'use client';

import React, { useState } from 'react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { DollarSign, Phone, Pencil, Trash2, Search, UserCheck, ShieldAlert, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export interface EmployeeItem {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  jobTitle: string;
  department: string;
  phone: string | null;
  biometricId: string | null;
  status?: string;
  salaryStructure: {
    weeklySalary: string | number;
    ipsDeductionPercent?: string | number;
  } | null;
  advancePayments?: Array<{ amount: string | number }>;
}

interface EmployeesTableProps {
  employees: EmployeeItem[];
  loading: boolean;
  onOpenAdvance: (employee: EmployeeItem) => void;
  onOpenEdit: (employee: EmployeeItem) => void;
  onDeleteEmployee: (employee: EmployeeItem) => void;
}

export function EmployeesTable({
  employees,
  loading,
  onOpenAdvance,
  onOpenEdit,
  onDeleteEmployee,
}: EmployeesTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  if (loading) {
    return (
      <div className="bg-card border border-card-border rounded-xl p-12 text-center text-xs text-muted-foreground font-mono">
        Cargando legajos de nómina desde Neon Postgres...
      </div>
    );
  }

  const filteredEmployees = employees.filter((emp) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      emp.firstName.toLowerCase().includes(term) ||
      emp.lastName.toLowerCase().includes(term) ||
      emp.code.toLowerCase().includes(term) ||
      emp.documentNumber.includes(term) ||
      emp.jobTitle.toLowerCase().includes(term) ||
      (emp.phone && emp.phone.includes(term))
    );
  });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Activo</span>
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Inactivo</span>
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <AlertTriangle className="w-2.5 h-2.5" />
            <span>Suspendido</span>
          </span>
        );
      case 'TERMINATED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-2.5 h-2.5" />
            <span>Baja</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden flex flex-col shadow-sm">
      {/* Barra de Búsqueda y Filtros */}
      <div className="p-3 bg-[#0d121c] border-b border-card-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, legajo, cargo o cédula..."
            className="w-full pl-8 pr-3 py-1.5 bg-card border border-card-border hover:border-sky-500/50 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-sky-400 transition-colors"
          />
        </div>

        <div className="text-xs text-muted-foreground font-mono self-end sm:self-center">
          Mostrando <strong className="text-foreground">{filteredEmployees.length}</strong> de {employees.length} funcionarios
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#090d16] border-b border-card-border text-[11px] font-mono uppercase text-muted-foreground">
            <tr>
              <th className="py-2.5 px-3">Legajo</th>
              <th className="py-2.5 px-3">Funcionario</th>
              <th className="py-2.5 px-3">Cédula N°</th>
              <th className="py-2.5 px-3">Cargo & Depto.</th>
              <th className="py-2.5 px-3">Estado</th>
              <th className="py-2.5 px-3">Contacto</th>
              <th className="py-2.5 px-3 text-right">Salario Semanal</th>
              <th className="py-2.5 px-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border font-mono text-muted-foreground">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground font-mono">
                  No se encontraron funcionarios que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => {
                const weeklyGross = Number(emp.salaryStructure?.weeklySalary || 0);

                return (
                  <tr key={emp.id} className="hover:bg-muted/15 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-foreground">{emp.code}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <div className="font-semibold text-foreground">
                        {emp.firstName} {emp.lastName}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        ID: {emp.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono">{emp.documentNumber}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <div className="text-foreground font-medium">{emp.jobTitle}</div>
                      <div className="text-[10px] text-muted-foreground">{emp.department || 'Operaciones'}</div>
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      {getStatusBadge(emp.status)}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      {emp.phone ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                          <Phone className="w-3 h-3 text-sky-400" /> {emp.phone}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-400 font-mono">
                      {formatCurrencyPYG(weeklyGross)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        
                        {/* Botón Solicitar Adelanto */}
                        <button
                          type="button"
                          onClick={() => onOpenAdvance(emp)}
                          title="Solicitar adelanto salarial / vale"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#0d121c] border border-card-border hover:border-emerald-500/50 text-muted-foreground hover:text-emerald-400 transition-colors text-[11px]"
                        >
                          <DollarSign className="w-3 h-3 text-emerald-400" />
                          <span>Adelanto</span>
                        </button>

                        {/* Botón Editar Datos */}
                        <button
                          type="button"
                          onClick={() => onOpenEdit(emp)}
                          title="Editar datos personales, cargo o salario"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#0d121c] border border-card-border hover:border-sky-500/50 text-muted-foreground hover:text-sky-400 transition-colors text-[11px]"
                        >
                          <Pencil className="w-3 h-3 text-sky-400" />
                          <span>Editar</span>
                        </button>

                        {/* Botón Eliminar Funcionario */}
                        <button
                          type="button"
                          onClick={() => onDeleteEmployee(emp)}
                          title="Eliminar funcionario de la plantilla"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#0d121c] border border-card-border hover:border-red-500/50 text-muted-foreground hover:text-red-400 transition-colors text-[11px]"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                          <span>Eliminar</span>
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-[#0d121c] px-4 py-2.5 border-t border-card-border flex items-center justify-between text-[11px] text-muted-foreground font-mono">
        <span>Plantilla total: <strong className="text-foreground">{employees.length}</strong> colaboradores registrados</span>
        <span>Régimen: Salario Semanal</span>
      </div>
    </div>
  );
}

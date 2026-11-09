'use client';

import React from 'react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { DollarSign, Phone, Shield, UserCheck } from 'lucide-react';

interface EmployeeItem {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  jobTitle: string;
  department: string;
  phone: string | null;
  biometricId: string | null;
  salaryStructure: {
    weeklySalary: string | number;
    ipsDeductionPercent: string | number;
  } | null;
  advancePayments?: Array<{ amount: string | number }>;
}

interface EmployeesTableProps {
  employees: EmployeeItem[];
  loading: boolean;
  onOpenAdvance: (employee: EmployeeItem) => void;
}

export function EmployeesTable({ employees, loading, onOpenAdvance }: EmployeesTableProps) {
  if (loading) {
    return (
      <div className="bg-card border border-card-border rounded-lg p-12 text-center text-xs text-muted-foreground font-mono">
        Cargando legajos de nómina desde Neon Postgres...
      </div>
    );
  }

  return (
    <div className="bg-card border border-card-border rounded-lg overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0d121c] border-b border-card-border text-[11px] font-mono uppercase text-muted-foreground">
            <tr>
              <th className="py-2.5 px-3">Legajo</th>
              <th className="py-2.5 px-3">Funcionario</th>
              <th className="py-2.5 px-3">Cédula N°</th>
              <th className="py-2.5 px-3">Cargo</th>
              <th className="py-2.5 px-3">Contacto</th>
              <th className="py-2.5 px-3 text-right">Salario Semanal</th>
              <th className="py-2.5 px-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border font-mono text-muted-foreground">
            {employees.map((emp) => {
              const weeklyGross = Number(emp.salaryStructure?.weeklySalary || 0);

              return (
                <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-foreground">{emp.code}</td>
                  <td className="py-2.5 px-3 font-sans text-foreground font-semibold">
                    {emp.firstName} {emp.lastName}
                  </td>
                  <td className="py-2.5 px-3 font-mono">{emp.documentNumber}</td>
                  <td className="py-2.5 px-3 font-sans text-foreground">{emp.jobTitle}</td>
                  <td className="py-2.5 px-3 font-sans">
                    {emp.phone ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Phone className="w-3 h-3 text-primary" /> {emp.phone}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                    {formatCurrencyPYG(weeklyGross)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onOpenAdvance(emp)}
                      title="Solicitar adelanto salarial"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0d121c] border border-card-border hover:border-accent text-muted-foreground hover:text-accent transition-colors text-[11px]"
                    >
                      <DollarSign className="w-3 h-3 text-accent" />
                      <span>Adelanto</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-[#0d121c] px-4 py-2.5 border-t border-card-border flex items-center justify-between text-[11px] text-muted-foreground font-mono">
        <span>Plantilla total: <strong className="text-foreground">{employees.length}</strong> empleados activos</span>
        <span>Régimen: Salario Semanal</span>
      </div>
    </div>
  );
}


'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { EmployeesTable } from './employees-table';
import { AdvanceModal } from './advance-modal';
import { AttendanceMonitor } from './attendance-monitor';
import { CreateEmployeeModal } from './create-employee-modal';
import { EditEmployeeModal } from './edit-employee-modal';
import { WeeklySettlementPanel } from './weekly-settlement-panel';
import { LoansManager } from './loans-manager';
import { Users, UserPlus, ScanFace, DollarSign, Wallet, ReceiptText, Coins } from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { useCustomDialog } from '@/components/common/custom-dialog-provider';

export function HrView() {
  const { confirm, alert } = useCustomDialog();
  const [activeTab, setActiveTab] = useState<'employees' | 'settlement' | 'loans' | 'biometrics'>('employees');
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [selectedEmpForAdvance, setSelectedEmpForAdvance] = useState<any>(null);
  const [selectedEmpForEdit, setSelectedEmpForEdit] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/hr/employees');
      const json = await res.json();
      if (json.success) setEmployees(json.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Cálculos consolidados de nómina
  const totalWeeklyPayroll = employees.reduce((acc, emp) => acc + Number(emp.salaryStructure?.weeklySalary || 0), 0);
  const averageWeeklySalary = employees.length > 0 ? Math.round(totalWeeklyPayroll / employees.length) : 0;

  const handleDeleteEmployee = async (emp: any) => {
    const ok = await confirm({
      title: 'Eliminar Funcionario',
      message: `¿Estás seguro de que deseas eliminar permanentemente de la nómina a ${emp.firstName} ${emp.lastName} (${emp.code})? Esta acción desvinculará sus registros y asistencias asociadas.`,
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (!ok) return;

    try {
      const res = await fetch(`/api/v1/hr/employees/${emp.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await alert({
          title: 'Funcionario Eliminado',
          message: data.data?.message || `El funcionario ${emp.firstName} ${emp.lastName} fue eliminado correctamente.`,
          variant: 'success',
        });
        fetchEmployees();
      } else {
        await alert({
          title: 'No se pudo eliminar',
          message: data.error?.message || 'Error al eliminar el funcionario',
          variant: 'danger',
        });
      }
    } catch (err: any) {
      await alert({
        title: 'Error de Red',
        message: err.message || 'No se pudo contactar al servidor',
        variant: 'danger',
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Recursos Humanos
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestión de plantilla, liquidación de salarios semanales y control biométrico en tiempo real.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-medium transition-colors shadow-sm self-start sm:self-auto"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Nuevo Funcionario</span>
        </button>
      </div>

      {/* Tarjetas KPI de Nómina Semanal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-card border border-card-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Nómina Semanal Total</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">{formatCurrencyPYG(totalWeeklyPayroll)}</div>
          <span className="text-[10px] text-muted-foreground font-mono">Presupuesto semanal del depósito</span>
        </div>

        <div className="p-4 rounded-lg bg-card border border-card-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Plantilla Activa</span>
            <Users className="w-4 h-4 text-accent" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground">{employees.length}</div>
          <span className="text-[10px] text-muted-foreground font-mono">Colaboradores registrados</span>
        </div>

        <div className="p-4 rounded-lg bg-card border border-card-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Salario Promedio Semanal</span>
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground">{formatCurrencyPYG(averageWeeklySalary)}</div>
          <span className="text-[10px] text-muted-foreground font-mono">Por colaborador por semana</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-card-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'employees'
              ? 'bg-primary/10 text-primary border border-primary/20 font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Fichas de Personal & Salarios</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settlement')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'settlement'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ReceiptText className="w-3.5 h-3.5" />
          <span>Liquidación Semanal & Recibos A4</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('loans')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'loans'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>Préstamos en Cuotas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('biometrics')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'biometrics'
              ? 'bg-accent/10 text-accent border border-accent/20 font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ScanFace className="w-3.5 h-3.5" />
          <span>Marcaciones en Vivo (IA)</span>
        </button>
      </div>

      {/* Contenido de la pestaña */}
      {activeTab === 'employees' ? (
        <EmployeesTable
          employees={employees}
          loading={loading}
          onOpenAdvance={setSelectedEmpForAdvance}
          onOpenEdit={setSelectedEmpForEdit}
          onDeleteEmployee={handleDeleteEmployee}
        />
      ) : activeTab === 'settlement' ? (
        <WeeklySettlementPanel />
      ) : activeTab === 'loans' ? (
        <LoansManager />
      ) : (
        <AttendanceMonitor />
      )}

      {/* Modales */}
      <AdvanceModal
        employee={selectedEmpForAdvance}
        isOpen={!!selectedEmpForAdvance}
        onClose={() => setSelectedEmpForAdvance(null)}
        onAdvanceCreated={fetchEmployees}
      />

      <CreateEmployeeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onEmployeeCreated={fetchEmployees}
      />

      <EditEmployeeModal
        employee={selectedEmpForEdit}
        isOpen={!!selectedEmpForEdit}
        onClose={() => setSelectedEmpForEdit(null)}
        onEmployeeUpdated={fetchEmployees}
      />
    </div>
  );
}


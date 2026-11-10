import { SystemRole } from '@prisma/client';

export type AppModule = 
  | 'dashboard'
  | 'inventory'
  | 'purchases'
  | 'billing'
  | 'shifts'
  | 'scheduled'
  | 'reports'
  | 'hr'
  | 'settings';

export interface RoleConfig {
  label: string;
  badgeColor: string;
  badgeBg: string;
  description: string;
  allowedModules: AppModule[];
}

export const ROLE_DEFINITIONS: Record<SystemRole, RoleConfig> = {
  SUPER_ADMIN: {
    label: 'Super Administrador',
    badgeColor: 'text-amber-400 border-amber-500/30',
    badgeBg: 'bg-amber-500/10',
    description: 'Control total irrestricto de todos los módulos, nóminas confidenciales y configuraciones.',
    allowedModules: ['dashboard', 'inventory', 'purchases', 'billing', 'shifts', 'scheduled', 'reports', 'hr', 'settings'],
  },
  ADMIN: {
    label: 'Administrador General',
    badgeColor: 'text-amber-400 border-amber-500/30',
    badgeBg: 'bg-amber-500/10',
    description: 'Gestión operativa, financiera y de personal completa.',
    allowedModules: ['dashboard', 'inventory', 'purchases', 'billing', 'shifts', 'scheduled', 'reports', 'hr', 'settings'],
  },
  GENERAL_MANAGER: {
    label: 'Gerente General',
    badgeColor: 'text-emerald-400 border-emerald-500/30',
    badgeBg: 'bg-emerald-500/10',
    description: 'Supervisión de ventas, caja, compras y reportes gerenciales.',
    allowedModules: ['dashboard', 'inventory', 'purchases', 'billing', 'shifts', 'scheduled', 'reports', 'hr', 'settings'],
  },
  OPERATIONAL_ADMIN: {
    label: 'Administración Operativa (Fátima)',
    badgeColor: 'text-teal-400 border-teal-500/30',
    badgeBg: 'bg-teal-500/10',
    description: 'Carga de productos, facturas, notas de pedido, recibos y nómina de personal. Precios protegidos por código.',
    allowedModules: ['dashboard', 'inventory', 'billing', 'shifts', 'scheduled', 'hr'],
  },
  CASHIER: {
    label: 'Cajero de Mostrador',
    badgeColor: 'text-emerald-400 border-emerald-500/30',
    badgeBg: 'bg-emerald-500/10',
    description: 'Punto de venta, facturación SIFEN, pedidos programados, apertura y cierre de su caja.',
    allowedModules: ['dashboard', 'billing', 'shifts', 'scheduled', 'inventory'],
  },
  WAREHOUSE_MANAGER: {
    label: 'Jefe de Depósito & Despacho',
    badgeColor: 'text-blue-400 border-blue-500/30',
    badgeBg: 'bg-blue-500/10',
    description: 'Control de inventario físico, recepción de compras, despacho de pedidos y flota.',
    allowedModules: ['dashboard', 'inventory', 'purchases', 'scheduled', 'settings'],
  },
  ACCOUNTANT: {
    label: 'Contador / Auditor',
    badgeColor: 'text-purple-400 border-purple-500/30',
    badgeBg: 'bg-purple-500/10',
    description: 'Facturación fiscal, compras con timbrado, retenciones, cuentas de clientes y reportes impositivos.',
    allowedModules: ['dashboard', 'billing', 'purchases', 'reports'],
  },
  HR_MANAGER: {
    label: 'Encargado de RRHH',
    badgeColor: 'text-pink-400 border-pink-500/30',
    badgeBg: 'bg-pink-500/10',
    description: 'Gestión de personal, asistencia biométrica, adelantos y liquidación de salarios.',
    allowedModules: ['dashboard', 'hr'],
  },
  OPERATOR: {
    label: 'Operador de Salón',
    badgeColor: 'text-slate-400 border-slate-500/30',
    badgeBg: 'bg-slate-500/10',
    description: 'Consulta rápida de precios, stock disponible y apoyo de mostrador.',
    allowedModules: ['dashboard', 'inventory', 'billing'],
  },
};

/**
 * Verifica si un rol tiene permiso para acceder a un módulo específico
 */
export function hasModulePermission(role: SystemRole | undefined | null, module: AppModule): boolean {
  if (!role) return false;
  const config = ROLE_DEFINITIONS[role];
  if (!config) return false;
  return config.allowedModules.includes(module);
}


'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Boxes,
  ReceiptText,
  Truck,
  FileBarChart,
  Users,
  Settings,
  ChevronRight,
  Landmark,
  Shield,
  UserCheck,
} from 'lucide-react';
import { DepositoLogo } from './deposito-logo';
import { useAuth } from '@/lib/auth/auth-context';
import { AppModule, ROLE_DEFINITIONS } from '@/lib/auth/permissions';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  module: AppModule;
}

const navigationItems: NavItem[] = [
  { name: 'Dashboard Central', href: '/', icon: LayoutDashboard, module: 'dashboard' },
  { name: 'Catálogo & Inventario', href: '/inventory', icon: Boxes, module: 'inventory' },
  { name: 'Compras a Proveedores', href: '/purchases', icon: Truck, module: 'purchases' },
  { name: 'Ventas & Facturación SIFEN', href: '/billing', icon: ReceiptText, module: 'billing' },
  { name: 'Caja & Tesorería', href: '/billing?tab=shifts', icon: Landmark, module: 'shifts' },
  { name: 'Reportes & Obras', href: '/reports', icon: FileBarChart, module: 'reports' },
  { name: 'Recursos Humanos & Nómina', href: '/hr', icon: Users, module: 'hr' },
  { name: 'Configuración & Flota', href: '/settings', icon: Settings, module: 'settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();

  // Filtrar según los permisos del usuario activo
  const visibleItems = navigationItems.filter((item) => hasPermission(item.module));
  const roleConfig = user?.role ? ROLE_DEFINITIONS[user.role] : null;

  return (
    <aside className="w-64 bg-card border-r border-card-border flex flex-col h-screen fixed left-0 top-0 z-40 select-none">
      {/* Cabecera de la barra lateral con Logo prominente */}
      <div className="h-20 flex items-center px-5 border-b border-card-border">
        <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
          <DepositoLogo className="h-12 w-auto" />
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider font-mono flex items-center justify-between">
          <span>Módulos Operativos</span>
          {user && (
            <span className="text-[9px] text-primary font-mono uppercase">
              {roleConfig?.label.split(' ')[0] || 'Activo'}
            </span>
          )}
        </div>

        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary border-l-2 border-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-primary" />}
            </Link>
          );
        })}
      </nav>

      {/* Pie de barra lateral con información del usuario conectado */}
      <div className="p-4 border-t border-card-border">
        <div className="bg-[#0d121c] border border-card-border rounded-md p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-emerald-400" />
              <span>Operador Activo</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <p className="text-xs font-semibold text-foreground mt-1 truncate">
            {user?.name || 'Depósito Central 4 de Marzo'}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] font-mono text-muted-foreground truncate">
              {user?.email || 'DEP-4M (Central)'}
            </span>
            {roleConfig && (
              <span className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded border ${roleConfig.badgeColor} ${roleConfig.badgeBg}`}>
                {user?.role}
              </span>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

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
} from 'lucide-react';
import { DepositoLogo } from './deposito-logo';

const navigationItems = [
  { name: 'Dashboard Central', href: '/', icon: LayoutDashboard },
  { name: 'Catálogo & Inventario', href: '/inventory', icon: Boxes },
  { name: 'Compras a Proveedores', href: '/purchases', icon: Truck },
  { name: 'Ventas & Facturación SIFEN', href: '/billing', icon: ReceiptText },
  { name: 'Caja & Tesorería', href: '/billing?tab=shifts', icon: Landmark },
  { name: 'Reportes & Obras', href: '/reports', icon: FileBarChart },
  { name: 'Recursos Humanos & Nómina', href: '/hr', icon: Users },
  { name: 'Configuración & Flota', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-card border-r border-card-border flex flex-col h-screen fixed left-0 top-0 z-40 select-none">
      {/* Cabecera de la barra lateral con Logo prominente */}
      <div className="h-20 flex items-center px-5 border-b border-card-border">
        <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
          <DepositoLogo className="h-12 w-auto" />
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">
          Módulos Operativos
        </div>
        {navigationItems.map((item) => {
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

      {/* Pie de barra lateral */}
      <div className="p-4 border-t border-card-border">
        <div className="bg-[#0d121c] border border-card-border rounded-md p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-mono">Terminal Activo</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <p className="text-xs font-semibold text-foreground mt-1 truncate">
            Depósito Central 4 de Marzo
          </p>
          <span className="text-[10px] font-mono text-muted-foreground">DEP-4M (Central)</span>
        </div>
      </div>
    </aside>
  );
}

'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { VehiclesManager } from './vehicles-manager';
import { UsersManager } from './users-manager';
import { Truck, Users, Settings2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

export function SettingsView() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'fleet' ? 'fleet' : 'users';
  const [activeTab, setActiveTab] = useState<'users' | 'fleet'>(initialTab);
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Encabezado del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Settings2 className="w-6 h-6 text-primary" />
            <span>Configuración del Sistema & Flota</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Control de accesos y roles del personal, auditoría de operadores y gestión logística de camiones
          </p>
        </div>

        {/* Selector de Pestañas */}
        <div className="flex p-1 bg-[#0d121c] border border-card-border rounded-xl">
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'users'
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Usuarios & Permisos</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('fleet')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'fleet'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Flota de Camiones</span>
          </button>
        </div>
      </div>

      {/* Contenido según pestaña */}
      <div>
        {activeTab === 'users' && isSuperAdmin ? (
          <UsersManager />
        ) : (
          <VehiclesManager />
        )}
      </div>
    </div>
  );
}


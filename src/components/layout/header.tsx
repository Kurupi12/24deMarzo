'use client';

import React from 'react';
import { Bell, Activity, Database } from 'lucide-react';

export function Header() {
  return (
    <header className="h-16 border-b border-card-border bg-card/60 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-8">
      {/* Indicador de Terminal y Sede */}
      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
        <span className="text-foreground font-semibold">Depósito 4 de Marzo</span>
        <span className="text-card-border">/</span>
        <span className="text-[11px] text-muted-foreground">Planta Central &bull; SIFEN Kuatia 1.5</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Indicador de conexión Neon Postgres */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0d121c] border border-card-border text-[11px] font-mono text-muted-foreground">
          <Database className="w-3.5 h-3.5 text-accent" />
          <span>Neon Postgres: Conectado</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        {/* Notificaciones del sistema */}
        <button
          type="button"
          aria-label="Alertas del sistema"
          className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          <span className="w-1.5 h-1.5 rounded-full bg-danger absolute top-2 right-2" />
        </button>

        {/* Estado operativo general */}
        <div className="flex items-center gap-2 pl-2 border-l border-card-border text-xs text-muted-foreground">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-[11px]">Sistemas Operativos</span>
        </div>
      </div>
    </header>
  );
}

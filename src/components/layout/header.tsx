'use client';

import React from 'react';
import { Search, Bell, Activity, Database } from 'lucide-react';

export function Header() {
  return (
    <header className="h-16 border-b border-card-border bg-card/60 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-8">
      {/* Buscador global */}
      <div className="flex items-center gap-4 w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar producto, CDC, legajo o cliente... (Ctrl+K)"
            className="w-full bg-[#0d121c] border border-card-border rounded-md pl-9 pr-12 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground bg-muted rounded border border-card-border">
            Ctrl+K
          </kbd>
        </div>
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

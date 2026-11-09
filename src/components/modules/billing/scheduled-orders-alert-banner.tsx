'use client';

import React, { useState, useEffect } from 'react';
import { Bell, ChevronRight, Clock } from 'lucide-react';

interface ScheduledOrdersAlertBannerProps {
  onViewScheduled: () => void;
}

export function ScheduledOrdersAlertBanner({ onViewScheduled }: ScheduledOrdersAlertBannerProps) {
  const [alerts, setAlerts] = useState<{ todayCount: number; hasDeliveriesToday: boolean }>({
    todayCount: 0,
    hasDeliveriesToday: false,
  });

  const checkAlerts = async () => {
    try {
      const res = await fetch('/api/v1/billing/scheduled-orders?filter=today');
      const json = await res.json();
      if (json.success && json.data?.alerts) {
        setAlerts(json.data.alerts);
      }
    } catch {
      // Ignorar
    }
  };

  useEffect(() => {
    checkAlerts();
    // Revisar periódicamente cada 60 segundos
    const timer = setInterval(checkAlerts, 60000);
    return () => clearInterval(timer);
  }, []);

  if (!alerts.hasDeliveriesToday || alerts.todayCount === 0) {
    return null;
  }

  return (
    <div className="bg-amber-500/15 border-2 border-amber-500/40 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-amber-500/25 text-amber-400 shrink-0">
          <Bell className="w-5 h-5 animate-bounce" />
        </div>
        <div>
          <h2 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
            <span>¡Recordatorio de Entregas para HOY!</span>
            <span className="text-[10px] font-mono bg-amber-500 text-black px-1.5 py-0.2 rounded-full font-extrabold">
              {alerts.todayCount} {alerts.todayCount === 1 ? 'pedido' : 'pedidos'}
            </span>
          </h2>
          <p className="text-[11px] text-muted-foreground font-sans mt-0.5">
            Hay pedidos tomados con fecha de entrega para hoy. Recuerda cargar al camión y cobrar los saldos pendientes en obra.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onViewScheduled}
        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs font-mono flex items-center justify-center gap-1.5 shadow transition-all self-start sm:self-auto shrink-0"
      >
        <Clock className="w-3.5 h-3.5" />
        <span>Gestionar Entregas de Hoy</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

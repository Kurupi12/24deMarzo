'use client';

import React, { useState, useEffect } from 'react';
import { ScanFace, CheckCircle2, Clock, Camera, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AttendanceRecordItem {
  id: string;
  recordedAt: string;
  type: string;
  source: string;
  confidenceScore: string | number | null;
  deviceId: string | null;
  employee: {
    code: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
    biometricId: string | null;
  };
}

export function AttendanceMonitor() {
  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/hr/attendances?limit=25');
      const json = await res.json();
      if (json.success) setRecords(json.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    const interval = setInterval(fetchRecords, 10000); // Polling cada 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-card border border-card-border rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-card-border pb-3">
        <div className="flex items-center gap-2">
          <ScanFace className="w-5 h-5 text-accent" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Monitor de Marcaciones Biométricas & Cámaras con IA
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Eventos recibidos en tiempo real vía webhook en <code className="text-accent font-mono text-[10px]">/api/v1/hr/biometrics/webhook</code>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchRecords}
          aria-label="Refrescar marcaciones"
          className="p-1.5 rounded-md bg-[#0d121c] border border-card-border text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-accent' : ''}`} />
        </button>
      </div>

      {records.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          No hay eventos de marcación registrados recientemente.
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((r) => {
            const dateStr = format(new Date(r.recordedAt), "dd/MM/yyyy HH:mm:ss", { locale: es });
            const confidence = r.confidenceScore ? (Number(r.confidenceScore) * 100).toFixed(1) : null;

            return (
              <div
                key={r.id}
                className="p-3 rounded-lg bg-[#0d121c] border border-card-border flex items-center justify-between font-mono text-xs hover:border-card-border/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                    <ScanFace className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-sans font-semibold text-foreground text-xs">
                      {r.employee.firstName} {r.employee.lastName}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {r.employee.code} · {r.employee.jobTitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Dispositivo y Confianza */}
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end text-[11px] text-muted-foreground">
                      <Camera className="w-3 h-3 text-muted-foreground" />
                      <span>{r.deviceId || 'Cámara IA'}</span>
                    </div>
                    {confidence && (
                      <span className="text-[10px] text-emerald-400 font-bold">
                        Confianza IA: {confidence}%
                      </span>
                    )}
                  </div>

                  {/* Tipo de evento y hora */}
                  <div className="text-right min-w-[130px]">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                      {r.type === 'CHECK_IN' ? 'Entrada' : r.type === 'CHECK_OUT' ? 'Salida' : r.type === 'BREAK_OUT' ? 'Salida Almuerzo' : r.type === 'BREAK_IN' ? 'Regreso Almuerzo' : r.type}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{dateStr}</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Info, X } from 'lucide-react';

export interface DialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
}

interface DialogContextType {
  confirm: (options: DialogOptions | string) => Promise<boolean>;
  alert: (options: DialogOptions | string) => Promise<void>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export function useCustomDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useCustomDialog debe usarse dentro de CustomDialogProvider');
  }
  return context;
}

export function CustomDialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    isConfirm: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    variant: 'danger' | 'warning' | 'primary' | 'success';
    resolve?: (value: any) => void;
  } | null>(null);

  const confirm = useCallback((options: DialogOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const opts = typeof options === 'string' ? { message: options } : options;
      setDialogState({
        isOpen: true,
        isConfirm: true,
        title: opts.title || 'Confirmación Requerida',
        message: opts.message,
        confirmText: opts.confirmText || 'Confirmar',
        cancelText: opts.cancelText || 'Cancelar',
        variant: opts.variant || 'primary',
        resolve,
      });
    });
  }, []);

  const alert = useCallback((options: DialogOptions | string): Promise<void> => {
    return new Promise((resolve) => {
      const opts = typeof options === 'string' ? { message: options } : options;
      setDialogState({
        isOpen: true,
        isConfirm: false,
        title: opts.title || 'Aviso del Sistema',
        message: opts.message,
        confirmText: opts.confirmText || 'Entendido',
        cancelText: '',
        variant: opts.variant || 'warning',
        resolve: () => resolve(),
      });
    });
  }, []);

  const handleClose = (value: boolean) => {
    if (dialogState?.resolve) {
      dialogState.resolve(value);
    }
    setDialogState(null);
  };

  // Interceptar window.alert y window.confirm nativos del navegador
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalAlert = window.alert;
    const originalConfirm = window.confirm;

    window.alert = (msg?: any) => {
      alert({
        title: 'Aviso del Sistema',
        message: String(msg || ''),
        variant: 'warning',
      });
    };

    window.confirm = (msg?: any) => {
      // Como window.confirm nativo es síncrono y los modales React son asíncronos,
      // la aplicación usará `useCustomDialog().confirm(...)` para control total.
      // Si algún script tercero llamara a window.confirm, abrimos el modal:
      confirm({
        title: 'Confirmación',
        message: String(msg || ''),
        variant: 'primary',
      });
      return false;
    };

    return () => {
      window.alert = originalAlert;
      window.confirm = originalConfirm;
    };
  }, [alert, confirm]);

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}

      {/* MODAL GLOBAL ESTILIZADO ACORDE AL SISTEMA */}
      {dialogState?.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-card-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden p-5 space-y-4 font-mono text-xs">
            {/* Cabecera del Modal */}
            <div className="flex items-start justify-between gap-3 border-b border-card-border pb-3">
              <div className="flex items-center gap-2.5">
                {dialogState.variant === 'danger' && <ShieldAlert className="w-5 h-5 text-danger shrink-0" />}
                {dialogState.variant === 'warning' && <AlertTriangle className="w-5 h-5 text-warning shrink-0" />}
                {dialogState.variant === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                {dialogState.variant === 'primary' && <Info className="w-5 h-5 text-primary shrink-0" />}
                <h3 className="text-sm font-bold text-foreground font-sans">
                  {dialogState.title}
                </h3>
              </div>

              {!dialogState.isConfirm && (
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Mensaje */}
            <div className="text-muted-foreground text-xs leading-relaxed font-sans py-1">
              {dialogState.message}
            </div>

            {/* Botones de Acción */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-card-border">
              {dialogState.isConfirm && (
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="px-4 py-2 rounded-lg border border-card-border bg-[#0d121c] text-muted-foreground hover:text-foreground hover:bg-card transition-colors text-xs font-semibold"
                >
                  {dialogState.cancelText}
                </button>
              )}

              <button
                type="button"
                autoFocus
                onClick={() => handleClose(true)}
                className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors shadow-md ${
                  dialogState.variant === 'danger'
                    ? 'bg-danger hover:bg-danger/80 text-white'
                    : dialogState.variant === 'warning'
                    ? 'bg-warning hover:bg-warning/80 text-black'
                    : dialogState.variant === 'success'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-primary hover:bg-primary-hover text-white'
                }`}
              >
                {dialogState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}


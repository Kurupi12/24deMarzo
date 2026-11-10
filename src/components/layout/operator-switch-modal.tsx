'use client';

import React, { useState } from 'react';
import { useAuth, AvailableOperator } from '@/lib/auth/auth-context';
import { ROLE_DEFINITIONS } from '@/lib/auth/permissions';
import {
  X,
  UserCheck,
  KeyRound,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Lock,
} from 'lucide-react';

interface OperatorSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OperatorSwitchModal({ isOpen, onClose }: OperatorSwitchModalProps) {
  const { user, availableUsers, switchOperator } = useAuth();
  const [selectedOperator, setSelectedOperator] = useState<AvailableOperator | null>(null);
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleSelect = (op: AvailableOperator) => {
    setSelectedOperator(op);
    setPin('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOperator) return;
    if (!pin || pin.length < 4) {
      setErrorMessage('Ingrese un PIN de al menos 4 dígitos.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const res = await switchOperator(selectedOperator.id, pin);
    setIsLoading(false);

    if (res.success) {
      setSuccessMessage(`¡Operador cambiado a ${selectedOperator.name}!`);
      setTimeout(() => {
        onClose();
        setSelectedOperator(null);
        setPin('');
        setSuccessMessage('');
      }, 700);
    } else {
      setErrorMessage(res.error || 'PIN incorrecto');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-card border border-card-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Cabecera del Modal */}
        <div className="p-4 bg-[#0b0e14] border-b border-card-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Cambio Rápido de Cajero / Operador
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            Seleccione el funcionario que atenderá el mostrador e ingrese su PIN de 4 dígitos para firmar sus operaciones.
          </p>

          {errorMessage && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Lista de Operadores Disponibles */}
          {!selectedOperator ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              <label className="text-[11px] font-mono uppercase text-muted-foreground tracking-wider">
                Seleccione Funcionario:
              </label>
              {availableUsers.map((op) => {
                const isCurrent = user?.id === op.id;
                const roleConfig = ROLE_DEFINITIONS[op.role];
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => handleSelect(op)}
                    className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                      isCurrent
                        ? 'bg-primary/5 border-primary/40 shadow-sm'
                        : 'bg-[#0d121c] border-card-border hover:border-primary/50 hover:bg-muted/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                        {op.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                          <span>{op.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-primary/20 text-primary font-mono px-1.5 py-0.2 rounded font-semibold">
                              ACTUAL
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {op.email}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${roleConfig?.badgeColor} ${roleConfig?.badgeBg}`}>
                        {roleConfig?.label || op.role}
                      </span>
                      <div className="text-[10px] text-muted-foreground mt-1 flex items-center justify-end gap-1 font-mono">
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>{op.hasPin ? 'PIN Activo' : 'Sin PIN'}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Formulario de ingreso de PIN para el operador seleccionado */
            <form onSubmit={handlePinSubmit} className="space-y-4 pt-1">
              <div className="p-3 bg-[#0d121c] border border-card-border rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-sm">
                    {selectedOperator.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">
                      {selectedOperator.name}
                    </h4>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {selectedOperator.email}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOperator(null)}
                  className="text-[11px] text-primary hover:underline font-mono"
                >
                  Cambiar
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-primary" />
                    <span>PIN de 4 dígitos:</span>
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    (Solo números)
                  </span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="&bull;&bull;&bull;&bull;"
                  autoFocus
                  required
                  className="w-full bg-[#0d121c] border border-card-border rounded-lg px-4 py-3 text-center text-xl tracking-[0.5em] font-mono text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOperator(null)}
                  disabled={isLoading}
                  className="flex-1 py-2 rounded-lg border border-card-border bg-muted/20 hover:bg-muted/40 text-xs font-semibold text-muted-foreground transition-colors"
                >
                  Volver a lista
                </button>
                <button
                  type="submit"
                  disabled={isLoading || pin.length < 4}
                  className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>Confirmar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Pie */}
        <div className="p-3 bg-[#090d16] border-t border-card-border text-center text-[10px] text-muted-foreground font-mono">
          Depósito 4 de Marzo &bull; Seguridad de Puntos de Venta
        </div>

      </div>
    </div>
  );
}

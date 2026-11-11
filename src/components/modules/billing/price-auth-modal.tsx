'use client';

import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';

interface PriceAuthModalProps {
  isOpen: boolean;
  product: {
    id: string;
    name: string;
    originalPrice: number;
  } | null;
  onClose: () => void;
  onSuccess: (productId: string, authorizedBy: string) => void;
}

export function PriceAuthModal({
  isOpen,
  product,
  onClose,
  onSuccess,
}: PriceAuthModalProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.trim().length < 4) {
      setErrorMessage('Ingrese el código de autorización de 6 dígitos o PIN de supervisor.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/v1/billing/price-override/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          productName: product.name,
        }),
      });
      const json = await res.json();

      if (json.success) {
        setSuccessMessage(json.message || 'Precio desbloqueado exitosamente.');
        setTimeout(() => {
          onSuccess(product.id, json.data?.authorizedBy || 'Osvaldo');
          setCode('');
          setSuccessMessage('');
          onClose();
        }, 600);
      } else {
        setErrorMessage(json.error || 'Código incorrecto o no autorizado.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-sm bg-card border border-card-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Encabezado */}
        <div className="p-4 bg-[#0b0e14] border-b border-card-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-semibold text-foreground">
              Autorización Requerida para Descuento
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted/30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-[#0d121c] border border-card-border rounded-lg space-y-1 text-left">
            <span className="text-[10px] font-mono uppercase text-muted-foreground">Producto:</span>
            <div className="text-xs font-semibold text-foreground truncate">{product.name}</div>
            <div className="text-[11px] font-mono text-primary flex items-center justify-between pt-1">
              <span>Precio de Lista:</span>
              <span className="font-bold">{formatCurrencyPYG(product.originalPrice)}</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground text-left">
            Los precios están protegidos. Para aplicar un descuento o precio especial, solicite a Osvaldo el <strong className="text-foreground">código de 6 dígitos</strong> generado en su celular.
          </p>

          {errorMessage && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2 text-left">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 flex items-center gap-2 text-left">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-primary" />
                <span>Código OTP o PIN:</span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                (Único uso)
              </span>
            </label>
            <input
              type="password"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="&bull;&bull;&bull;&bull;&bull;&bull;"
              autoFocus
              required
              className="w-full bg-[#0d121c] border border-card-border rounded-lg px-4 py-2.5 text-center text-xl tracking-[0.4em] font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2 rounded-lg border border-card-border bg-muted/20 hover:bg-muted/40 text-xs font-semibold text-muted-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || code.length < 4}
              className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-md shadow-primary/20"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>Desbloquear</span>
                  <Unlock className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}


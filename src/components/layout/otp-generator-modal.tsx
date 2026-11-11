'use client';

import React, { useState } from 'react';
import {
  KeyRound,
  X,
  Copy,
  Check,
  Loader2,
  Clock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface OtpGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OtpGeneratorModal({ isOpen, onClose }: OtpGeneratorModalProps) {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/billing/price-override/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCode(json.data.code);
        setExpiresAt(json.data.expiresAt);
      } else {
        setError(json.error || 'Error al generar código');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-sm bg-card border border-card-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Encabezado */}
        <div className="p-4 bg-[#0b0e14] border-b border-card-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-semibold text-foreground">
              Autorización de Descuento (OTP)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted/30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 text-center space-y-4">
          <p className="text-xs text-muted-foreground">
            Genera un código dinámico de <span className="text-foreground font-semibold">único uso</span> para autorizar a Fátima o cajeros a modificar un precio de venta.
          </p>

          {code ? (
            <div className="space-y-3">
              <div className="p-4 bg-[#0d121c] border-2 border-primary/50 rounded-xl space-y-1">
                <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest">
                  Código de Único Uso
                </span>
                <div className="text-3xl font-bold font-mono text-primary tracking-[0.25em]">
                  {code.slice(0, 3)} {code.slice(3)}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono flex items-center justify-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Válido por 15 minutos</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-1 py-2 px-3 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-primary/20"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar para WhatsApp</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="py-2 px-3 bg-muted/30 hover:bg-muted/50 border border-card-border rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
                  title="Generar otro código"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generando código seguro...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Generar Código de 6 Dígitos</span>
                </>
              )}
            </button>
          )}

          {error && (
            <p className="text-xs text-red-400 font-mono">{error}</p>
          )}

          <div className="pt-2 border-t border-card-border/60 flex items-center justify-center gap-1.5 text-[10px] font-mono text-muted-foreground/80">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Se destruye automáticamente al ser utilizado</span>
          </div>

        </div>

      </div>
    </div>
  );
}


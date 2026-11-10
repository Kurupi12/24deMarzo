'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { DepositoLogo } from '@/components/layout/deposito-logo';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Asegurar que los campos inicien completamente vacíos sin recordar contraseñas
  useEffect(() => {
    setEmail('');
    setPassword('');
    setErrorMessage('');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Por favor ingrese su usuario y contraseña.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const res = await login(email, password);
    if (!res.success) {
      setErrorMessage(res.error || 'Credenciales inválidas');
      setIsLoading(false);
      setPassword(''); // Limpiar campo de clave tras error
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] flex flex-col justify-center items-center px-4 relative overflow-hidden select-none">
      {/* Luces sutiles de fondo industrial */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Contenedor Principal de la Tarjeta */}
      <div className="w-full max-w-md z-10">
        <div className="bg-card/90 backdrop-blur-xl border border-card-border/80 rounded-2xl shadow-2xl p-8 space-y-7">
          
          {/* Logo y Encabezado */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="p-3 bg-[#0d121c] border border-card-border rounded-xl shadow-inner">
              <DepositoLogo className="h-14 w-auto" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Depósito 4 de Marzo
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                Planta Central &bull; Suite Operativa ERP & Facturación SIFEN
              </p>
            </div>
          </div>

          {/* Mensaje de Error si ocurre */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Formulario de Login sin autocompletado ni recordar claves */}
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            {/* Campo de Correo / Usuario */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-primary" />
                <span>Correo o Usuario</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="d4m_identity_user"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@deposito4demarzo.com.py"
                  disabled={isLoading}
                  required
                  className="w-full bg-[#0d121c] border border-card-border rounded-lg px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            {/* Campo de Contraseña */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  <span>Contraseña</span>
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="d4m_identity_password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  disabled={isLoading}
                  required
                  className="w-full bg-[#0d121c] border border-card-border rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Botón de Ingreso */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all disabled:opacity-60 active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Pie de Seguridad */}
          <div className="flex items-center justify-center gap-2 pt-2 border-t border-card-border/60 text-[11px] font-mono text-muted-foreground/70">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Acceso Seguro &bull; Sesión Cifrada</span>
          </div>

        </div>

        {/* Información de Planta */}
        <div className="mt-6 text-center text-xs text-muted-foreground/60 font-mono">
          Depósito 4 de Marzo S.R.L. &bull; RUC 80089754-2
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Activity,
  Database,
  Clock,
  Landmark,
  CheckCircle2,
  ChevronRight,
  X,
  Package,
  User,
  LogOut,
  KeyRound,
  Shield,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { ROLE_DEFINITIONS } from '@/lib/auth/permissions';
import { OperatorSwitchModal } from './operator-switch-modal';
import { OtpGeneratorModal } from './otp-generator-modal';

interface SystemNotification {
  id: string;
  type: 'warning' | 'danger' | 'info' | 'success';
  title: string;
  message: string;
  link: string;
  linkText: string;
  createdAt: string;
}

export function Header() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);

  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/v1/notifications');
      const json = await res.json();
      if (json.success && json.data) {
        setNotifications(json.data.notifications || []);
        setUnreadCount(json.data.unreadCount || 0);
      }
    } catch {
      // Ignorar
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'danger':
        return <Package className="w-4 h-4 text-red-400 shrink-0" />;
      case 'warning':
        return <Clock className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'info':
        return <Landmark className="w-4 h-4 text-blue-400 shrink-0" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
  };

  const roleConfig = user?.role ? ROLE_DEFINITIONS[user.role] : null;

  return (
    <>
      <header className="h-16 border-b border-card-border bg-card/60 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-8 select-none">
        {/* Indicador de Terminal y Sede */}
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <span className="text-foreground font-semibold">Depósito 4 de Marzo</span>
          <span className="text-card-border">/</span>
          <span className="text-[11px] text-muted-foreground">Planta Central &bull; SIFEN Kuatia 1.5</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Botón de Generar Código de Descuento (Exclusivo para Osvaldo / Super Admin) */}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setIsOtpModalOpen(true)}
              title="Generar código de 6 dígitos para autorizar cambio de precio en caja"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Autorizar Descuento (OTP)</span>
            </button>
          )}

          {/* Indicador de conexión Neon Postgres */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-[#0d121c] border border-card-border text-[11px] font-mono text-muted-foreground">
            <Database className="w-3.5 h-3.5 text-accent" />
            <span>Neon Postgres: Conectado</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          {/* Notificaciones del sistema con Dropdown interactivo */}
          <div className="relative" ref={notifDropdownRef}>
            <button
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              aria-label="Alertas del sistema"
              title={unreadCount > 0 ? `${unreadCount} alerta(s) pendiente(s)` : 'Alertas del sistema'}
              className={`p-2 rounded-lg transition-colors relative ${
                isNotifOpen
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              )}
            </button>

            {/* Menú Flotante de Notificaciones */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-card-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3 bg-[#0b0e14] border-b border-card-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground">Alertas del Sistema</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] bg-red-500/20 text-red-400 font-mono font-bold px-1.5 py-0.2 rounded border border-red-500/30">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNotifOpen(false)}
                    className="text-muted-foreground hover:text-foreground p-1 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-card-border max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground font-mono">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                      No hay alertas pendientes. Todo en orden.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="p-3 hover:bg-muted/10 transition-colors space-y-1.5"
                      >
                        <div className="flex items-start gap-2.5">
                          {getIcon(notif.type)}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-semibold text-foreground leading-snug">
                              {notif.title}
                            </h4>
                            <p className="text-[11px] text-muted-foreground font-sans leading-relaxed mt-0.5">
                              {notif.message}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <a
                            href={notif.link}
                            onClick={() => setIsNotifOpen(false)}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-primary hover:text-primary-hover font-semibold"
                          >
                            <span>{notif.linkText}</span>
                            <ChevronRight className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2.5 bg-[#090d16] border-t border-card-border text-center text-[10px] text-muted-foreground font-mono">
                  Depósito 4 de Marzo &bull; Monitoreo en Vivo
                </div>
              </div>
            )}
          </div>

          {/* Menú de Usuario y Perfil */}
          <div className="relative pl-2 border-l border-card-border" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-lg border border-card-border hover:border-primary/40 bg-[#0d121c] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs">
                {user ? user.name.charAt(0) : <User className="w-3.5 h-3.5" />}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-foreground leading-none flex items-center gap-1.5">
                  <span className="truncate max-w-[130px]">{user?.name || 'Administrador'}</span>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                  {roleConfig?.label.split(' ')[0] || user?.role || 'Operador'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>

            {/* Menú Desplegable de Usuario */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-card border border-card-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3.5 bg-[#0b0e14] border-b border-card-border">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {user?.name || 'Usuario del Sistema'}
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">
                    {user?.email || 'admin@deposito4demarzo.com.py'}
                  </p>
                  {roleConfig && (
                    <div className="mt-2">
                      <span className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${roleConfig.badgeColor} ${roleConfig.badgeBg}`}>
                        {roleConfig.label}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-1 space-y-0.5">
                  {/* Opción de generar OTP si es admin */}
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsOtpModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-amber-400 hover:bg-amber-500/10 rounded-md transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Generar Token Descuento</span>
                    </button>
                  )}

                  {/* Opción: Cambiar de Cajero / Operador (PIN) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsSwitchModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/30 rounded-md transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Cambiar Operador (PIN)</span>
                  </button>

                  {/* Opción: Cerrar Sesión */}
                  <button
                    type="button"
                    onClick={async () => {
                      setIsUserMenuOpen(false);
                      await logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>

                <div className="p-2 bg-[#090d16] border-t border-card-border text-center text-[10px] text-muted-foreground font-mono">
                  Sesión Segura &bull; Depósito 4 de Marzo
                </div>
              </div>
            )}
          </div>

          {/* Estado operativo general */}
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-card-border text-xs text-muted-foreground">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-[11px]">Sistemas Operativos</span>
          </div>
        </div>
      </header>

      {/* Modal de Conmutación Rápida de Cajero por PIN */}
      <OperatorSwitchModal
        isOpen={isSwitchModalOpen}
        onClose={() => setIsSwitchModalOpen(false)}
      />

      {/* Modal de Generación de Token OTP de Precio */}
      <OtpGeneratorModal
        isOpen={isOtpModalOpen}
        onClose={() => setIsOtpModalOpen(false)}
      />
    </>
  );
}

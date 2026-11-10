'use client';

import React, { useState, useEffect } from 'react';
import { SystemRole } from '@prisma/client';
import { ROLE_DEFINITIONS, RoleConfig } from '@/lib/auth/permissions';
import {
  Users,
  UserPlus,
  ShieldCheck,
  KeyRound,
  Lock,
  Mail,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  Check,
  X,
  Eye,
  EyeOff,
  ShoppingBag,
} from 'lucide-react';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
  hasPin: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  salesCount: number;
}

export function UsersManager() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formRole, setFormRole] = useState<SystemRole>('CASHIER');
  const [formIsActive, setFormIsActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/users');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setUsers(json.data);
      }
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormPin('');
    setFormRole('CASHIER');
    setFormIsActive(true);
    setFeedbackMessage(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (user: SystemUser) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword(''); // Vacío para no cambiarlo a menos que se especifique
    setFormPin('');
    setFormRole(user.role);
    setFormIsActive(user.isActive);
    setFeedbackMessage(null);
    setIsCreateModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      if (editingUser) {
        // Actualizar usuario existente
        const payload: any = {
          name: formName,
          email: formEmail,
          role: formRole,
          isActive: formIsActive,
        };
        if (formPassword.trim()) payload.password = formPassword.trim();
        if (formPin.trim()) payload.pinCode = formPin.trim();

        const res = await fetch(`/api/v1/users/${editingUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();

        if (json.success) {
          setFeedbackMessage({ type: 'success', text: 'Usuario actualizado correctamente.' });
          await fetchUsers();
          setTimeout(() => setIsCreateModalOpen(false), 900);
        } else {
          setFeedbackMessage({ type: 'error', text: json.error || 'Error al actualizar usuario' });
        }
      } else {
        // Crear nuevo usuario
        if (!formPassword) {
          setFeedbackMessage({ type: 'error', text: 'La contraseña es obligatoria para nuevos usuarios.' });
          setIsSubmitting(false);
          return;
        }

        const res = await fetch('/api/v1/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            email: formEmail,
            password: formPassword,
            role: formRole,
            pinCode: formPin || null,
          }),
        });
        const json = await res.json();

        if (json.success) {
          setFeedbackMessage({ type: 'success', text: `Usuario ${formName} creado exitosamente.` });
          await fetchUsers();
          setTimeout(() => setIsCreateModalOpen(false), 900);
        } else {
          setFeedbackMessage({ type: 'error', text: json.error || 'Error al crear usuario' });
        }
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Error en la solicitud' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user: SystemUser) => {
    try {
      const res = await fetch(`/api/v1/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        setUsers(users.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u)));
      }
    } catch (err) {
      console.error('Error toggling user status:', err);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedRoleConfig: RoleConfig = ROLE_DEFINITIONS[formRole];

  return (
    <div className="space-y-6">
      {/* Tarjetas Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-card border border-card-border rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-mono">Usuarios Registrados</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {users.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Cuentas creadas en el sistema</p>
        </div>

        <div className="p-4 bg-card border border-card-border rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-mono">Administradores</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {users.filter((u) => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN').length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Acceso total y confidencial</p>
        </div>

        <div className="p-4 bg-card border border-card-border rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-mono">Cajeros & Ventas</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {users.filter((u) => u.role === 'CASHIER').length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Operadores de mostrador</p>
        </div>

        <div className="p-4 bg-card border border-card-border rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-mono">Con PIN de Mostrador</span>
            <KeyRound className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-400">
            {users.filter((u) => u.hasPin).length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Habilitados para cambio rápido</p>
        </div>
      </div>

      {/* Barra de Acciones y Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, email o rol..."
            className="w-full pl-9 pr-4 py-2 bg-[#0d121c] border border-card-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={fetchUsers}
            className="p-2 border border-card-border rounded-lg bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
            title="Refrescar listado"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.99]"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Funcionario / Usuario</span>
          </button>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b0e14] border-b border-card-border text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Funcionario / Identificador</th>
                <th className="px-4 py-3">Rol & Permisos</th>
                <th className="px-4 py-3">PIN Mostrador</th>
                <th className="px-4 py-3">Ventas Registradas</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Último Acceso</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground font-mono">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    Cargando usuarios del sistema...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground font-mono">
                    No se encontraron usuarios coincidentes.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleConfig = ROLE_DEFINITIONS[u.role];
                  return (
                    <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-xs">{u.name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${roleConfig?.badgeColor} ${roleConfig?.badgeBg}`}>
                          {roleConfig?.label || u.role}
                        </span>
                        <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 max-w-xs">
                          {roleConfig?.description}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {u.hasPin ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                            <KeyRound className="w-3 h-3" />
                            <span>Configurado</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-muted-foreground/60">
                            Sin PIN
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono text-xs">
                        {u.salesCount} operaciones
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono transition-colors border ${
                            u.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                              : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30'
                          }`}
                          title="Haga clic para cambiar estado"
                        >
                          {u.isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Activo</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-red-400" />
                              <span>Inactivo</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleString('es-PY', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Nunca'}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-semibold px-2.5 py-1 rounded border border-card-border hover:border-primary/40 bg-[#0d121c] transition-colors"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Crear / Editar Usuario */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-card border border-card-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            
            <div className="p-4 bg-[#0b0e14] border-b border-card-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  {editingUser ? `Editar Usuario: ${editingUser.name}` : 'Nuevo Funcionario / Usuario'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              {feedbackMessage && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    feedbackMessage.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      : 'bg-red-500/10 border border-red-500/30 text-red-400'
                  }`}
                >
                  {feedbackMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{feedbackMessage.text}</span>
                </div>
              )}

              {/* Nombre Completo */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>Nombre Completo:</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="ej. Marcos López"
                  required
                  className="w-full bg-[#0d121c] border border-card-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              {/* Correo Electrónico / Identificador */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  <span>Correo Electrónico / Usuario:</span>
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="ej. cajero1@deposito4demarzo.com.py"
                  required
                  className="w-full bg-[#0d121c] border border-card-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              {/* Rol Asignado */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span>Rol Operativo en el Depósito:</span>
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as SystemRole)}
                  className="w-full bg-[#0d121c] border border-card-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
                >
                  <option value="SUPER_ADMIN">Super Administrador (Osvaldo & Dirección)</option>
                  <option value="ADMIN">Administrador General</option>
                  <option value="CASHIER">Cajero de Mostrador (Punto de Venta & Caja)</option>
                  <option value="WAREHOUSE_MANAGER">Jefe de Depósito & Despacho (Stock & Flota)</option>
                  <option value="ACCOUNTANT">Contador / Auditor (IVA & Facturas DNIT)</option>
                  <option value="HR_MANAGER">Encargado de RRHH (Nómina & Asistencia)</option>
                  <option value="OPERATOR">Operador de Salón (Consulta de Precios)</option>
                </select>

                {/* Explicación del Rol Seleccionado */}
                <div className="p-2.5 bg-[#090d16] border border-card-border rounded-md mt-1 text-[11px] text-muted-foreground">
                  <div className="font-semibold text-foreground mb-0.5">
                    Permisos de {selectedRoleConfig?.label}:
                  </div>
                  <p>{selectedRoleConfig?.description}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedRoleConfig?.allowedModules.map((m) => (
                      <span key={m} className="text-[9px] font-mono bg-primary/10 text-primary px-1.5 py-0.2 rounded border border-primary/20">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contraseña */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {editingUser ? 'Nueva Contraseña (dejar en blanco para no cambiarla):' : 'Contraseña de Acceso:'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={editingUser ? 'Sin cambios...' : 'Mínimo 6 caracteres'}
                    required={!editingUser}
                    className="w-full bg-[#0d121c] border border-card-border rounded-lg pl-3 pr-9 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* PIN de Mostrador (4 dígitos) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-primary" />
                    <span>PIN de Mostrador (4 dígitos):</span>
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Para cambio rápido en mostrador
                  </span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={formPin}
                  onChange={(e) => setFormPin(e.target.value.replace(/\D/g, ''))}
                  placeholder={editingUser && editingUser.hasPin ? '•••• (PIN asignado)' : 'ej. 1234'}
                  className="w-full bg-[#0d121c] border border-card-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono tracking-widest text-center"
                />
              </div>

              {/* Estado Activo */}
              {editingUser && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded border-card-border bg-[#0d121c] text-primary focus:ring-0"
                  />
                  <label htmlFor="isActiveCheck" className="text-xs text-foreground cursor-pointer">
                    Cuenta Habilitada y Activa
                  </label>
                </div>
              )}

              {/* Botones de Acción */}
              <div className="flex gap-2 pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2 rounded-lg border border-card-border bg-muted/20 hover:bg-muted/40 text-xs font-semibold text-muted-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>{editingUser ? 'Guardar Cambios' : 'Crear Usuario'}</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}

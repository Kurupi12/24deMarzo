'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  StickyNote,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  User,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

interface ReminderTarget {
  id: string;
  name: string;
  role: string;
}

interface LocalReminderItem {
  id: string;
  text: string;
  targetUserId: string | null;
  targetUser: ReminderTarget | null;
  createdById: string;
  createdBy: { id: string; name: string } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function LocalRemindersWidget() {
  const { user, availableUsers, isLoading } = useAuth();
  const pathname = usePathname();

  const [reminders, setReminders] = useState<LocalReminderItem[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Estado de creación (solo Dirección)
  const [newText, setNewText] = useState('');
  const [newTargetId, setNewTargetId] = useState<string>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estado de edición en línea (solo Dirección)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editTargetId, setEditTargetId] = useState<string>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);

  const knownIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedRef = useRef<boolean>(false);
  const initializedDefaultTargetRef = useRef<boolean>(false);

  const userId = user?.id;
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  // Opciones de destinatarios (priorizando a Fátima / operadores no-admin primero)
  const recipientOptions = useMemo(() => {
    return availableUsers.filter((op) => op.id !== userId);
  }, [availableUsers, userId]);

  useEffect(() => {
    if (initializedDefaultTargetRef.current || recipientOptions.length === 0) return;
    const fatima = recipientOptions.find(
      (op) =>
        op.role === 'OPERATIONAL_ADMIN' ||
        op.name.toLowerCase().includes('fatima') ||
        op.name.toLowerCase().includes('fátima')
    );
    if (fatima) {
      setNewTargetId(fatima.id);
    }
    initializedDefaultTargetRef.current = true;
  }, [recipientOptions]);

  const fetchReminders = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch('/api/v1/reminders', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && json.data) {
        const incoming: LocalReminderItem[] = json.data.reminders || [];
        setReminders(incoming);

        // Si es destinatario (no admin) y aparece un recordatorio nuevo, expandir automáticamente
        if (!isAdmin) {
          const prevIds = knownIdsRef.current;
          const hasNew = incoming.some((r) => !prevIds.has(r.id));
          if (!hasLoadedRef.current && incoming.length > 0) {
            setIsOpen(true);
          } else if (hasNew && incoming.length > 0) {
            setIsOpen(true);
          }
        }

        knownIdsRef.current = new Set(incoming.map((r) => r.id));
        hasLoadedRef.current = true;
      }
    } catch {
      // Ignorar fallos transitorios de red
    }
  }, [userId, isAdmin]);

  useEffect(() => {
    if (!userId || pathname === '/login') {
      setReminders([]);
      hasLoadedRef.current = false;
      knownIdsRef.current = new Set();
      setIsOpen(false);
      return;
    }

    hasLoadedRef.current = false;
    knownIdsRef.current = new Set();
    setIsOpen(false);

    fetchReminders();
    const interval = setInterval(fetchReminders, 30000);
    const onFocus = () => fetchReminders();
    const onOpenEvent = () => {
      setIsOpen(true);
      fetchReminders();
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('open-local-reminders', onOpenEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('open-local-reminders', onOpenEvent);
    };
  }, [userId, pathname, fetchReminders]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newText.trim();
    if (!clean) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/v1/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: clean,
          targetUserId: newTargetId,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setErrorMsg(json.error || 'No se pudo guardar el recordatorio');
      } else {
        setNewText('');
        await fetchReminders();
      }
    } catch {
      setErrorMsg('Error de conexión al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (item: LocalReminderItem) => {
    setEditingId(item.id);
    setEditText(item.text);
    setEditTargetId(item.targetUserId || 'ALL');
    setErrorMsg(null);
  };

  const handleSaveEdit = async (id: string) => {
    const clean = editText.trim();
    if (!clean) return;

    setBusyId(id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: clean,
          targetUserId: editTargetId,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setErrorMsg(json.error || 'No se pudo actualizar');
      } else {
        setEditingId(null);
        await fetchReminders();
      }
    } catch {
      setErrorMsg('Error de conexión al actualizar');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = async (item: LocalReminderItem) => {
    setBusyId(item.id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/reminders/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchReminders();
      } else {
        setErrorMsg(json.error || 'No se pudo cambiar el estado');
      }
    } catch {
      setErrorMsg('Error de conexión');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/reminders/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        if (editingId === id) setEditingId(null);
        await fetchReminders();
      } else {
        setErrorMsg(json.error || 'No se pudo eliminar');
      }
    } catch {
      setErrorMsg('Error de conexión al eliminar');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading || !user || pathname === '/login') {
    return null;
  }

  // Para usuarios que NO son Dirección: si no hay recordatorios activos, no mostrar absolutamente nada
  if (!isAdmin && reminders.length === 0) {
    return null;
  }

  const activeCount = reminders.filter((r) => r.isActive).length;

  // Vista minimizada (pastilla discreta abajo a la derecha)
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-40 print:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Abrir mini ventana de recordatorios del local"
          className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-amber-500/40 bg-[#0d121c]/95 hover:bg-[#141c2b] backdrop-blur-md text-amber-300 shadow-xl transition-all active:scale-95"
        >
          <StickyNote className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold">Recordatorios</span>
          {activeCount > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-[#0b0e14] text-[10px] font-mono font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
          <ChevronUp className="w-3.5 h-3.5 text-amber-400/80" />
        </button>
      </div>
    );
  }

  // Mini ventanita abierta
  return (
    <div className="fixed bottom-4 right-4 z-40 w-[340px] sm:w-[375px] max-w-[calc(100vw-2rem)] bg-[#0d121c]/95 backdrop-blur-md border border-amber-500/35 rounded-xl shadow-2xl overflow-hidden print:hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
      {/* Encabezado de la mini ventana */}
      <div className="px-3.5 py-2.5 bg-[#090d16] border-b border-amber-500/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StickyNote className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold text-amber-200 truncate">
            Recordatorios del Local
          </span>
          {activeCount > 0 && (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {activeCount}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          title="Minimizar ventanita"
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Formulario rápido (SOLO Osvaldo / Dirección) */}
      {isAdmin && (
        <form onSubmit={handleCreate} className="p-3 border-b border-card-border bg-[#0b1019] space-y-2">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              maxLength={200}
              placeholder="Ej: Ver cerradura baño"
              disabled={isSubmitting}
              className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg bg-[#070a10] border border-card-border focus:border-amber-500/60 focus:outline-none text-foreground placeholder:text-muted-foreground/60"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newText.trim()}
              title="Agregar recordatorio"
              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-[#0b0e14] text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cargar</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-1 min-w-0">
              <User className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="shrink-0">Para:</span>
              <select
                value={newTargetId}
                onChange={(e) => setNewTargetId(e.target.value)}
                disabled={isSubmitting}
                className="flex-1 min-w-0 px-2 py-1 text-[11px] rounded bg-[#070a10] border border-card-border text-foreground focus:border-amber-500/60 focus:outline-none truncate"
              >
                {recipientOptions.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.name}
                  </option>
                ))}
                <option value="ALL">Todos en el local</option>
              </select>
            </label>
            <span className="text-[10px] font-mono text-muted-foreground/70 shrink-0">
              {newText.length}/200
            </span>
          </div>

          {errorMsg && (
            <p className="text-[11px] text-red-400 font-medium">{errorMsg}</p>
          )}
        </form>
      )}

      {/* Lista de recordatorios */}
      <div className="max-h-64 overflow-y-auto divide-y divide-card-border/70">
        {reminders.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No hay recordatorios cargados. Cuando agregues uno, le aparecerá automáticamente al usuario elegido.
          </div>
        ) : (
          reminders.map((item) => {
            const isEditing = editingId === item.id;
            const isBusy = busyId === item.id;

            return (
              <div
                key={item.id}
                className={`px-3.5 py-2.5 transition-colors ${
                  item.isActive ? 'bg-transparent' : 'bg-[#070a10]/60 opacity-60'
                }`}
              >
                {isAdmin && isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      maxLength={200}
                      autoFocus
                      className="w-full px-2.5 py-1.5 text-xs rounded-md bg-[#070a10] border border-amber-500/50 focus:outline-none text-foreground"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={editTargetId}
                        onChange={(e) => setEditTargetId(e.target.value)}
                        className="flex-1 min-w-0 px-2 py-1 text-[11px] rounded bg-[#070a10] border border-card-border text-foreground focus:outline-none"
                      >
                        {recipientOptions.map((op) => (
                          <option key={op.id} value={op.id}>
                            {op.name}
                          </option>
                        ))}
                        <option value="ALL">Todos en el local</option>
                      </select>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          disabled={isBusy || !editText.trim()}
                          title="Guardar cambios"
                          className="p-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          disabled={isBusy}
                          title="Cancelar edición"
                          className="p-1.5 rounded bg-muted/30 hover:bg-muted/50 text-muted-foreground"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <span
                        className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                          item.isActive ? 'bg-amber-400' : 'bg-muted-foreground/50'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs leading-snug break-words ${
                            item.isActive ? 'text-foreground font-medium' : 'text-muted-foreground line-through'
                          }`}
                        >
                          {item.text}
                        </p>
                        {isAdmin && (
                          <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-muted-foreground">
                            <span>
                              Para: {item.targetUser ? item.targetUser.name : 'Todos'}
                            </span>
                            <span>&bull;</span>
                            <span className={item.isActive ? 'text-emerald-400' : 'text-muted-foreground'}>
                              {item.isActive ? 'Visible' : 'Oculto'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Acciones exclusivas de Dirección */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          disabled={isBusy}
                          title={item.isActive ? 'Ocultar para el destinatario' : 'Volver a mostrar'}
                          className={`p-1 rounded transition-colors ${
                            item.isActive
                              ? 'text-emerald-400 hover:bg-emerald-500/15'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                          }`}
                        >
                          {item.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          disabled={isBusy}
                          title="Editar recordatorio"
                          className="p-1 rounded text-muted-foreground hover:text-amber-300 hover:bg-amber-500/15 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={isBusy}
                          title="Borrar recordatorio definitivamente"
                          className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/15 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pie discreto */}
      <div className="px-3.5 py-1.5 bg-[#090d16] border-t border-card-border flex items-center justify-between text-[10px] font-mono text-muted-foreground">
        <span>{isAdmin ? 'Solo Dirección administra' : 'Nota de Dirección'}</span>
        <span>Depósito 4 de Marzo</span>
      </div>
    </div>
  );
}

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SystemRole } from '@prisma/client';
import { AppModule, hasModulePermission, ROLE_DEFINITIONS } from './permissions';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
}

export interface AvailableOperator {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
  hasPin: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  availableUsers: AvailableOperator[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchOperator: (targetUserId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  refreshSession: () => Promise<void>;
  hasPermission: (module: AppModule) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  availableUsers: [],
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  switchOperator: async () => ({ success: false }),
  refreshSession: async () => {},
  hasPermission: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [availableUsers, setAvailableUsers] = useState<AvailableOperator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/auth/me');
      const json = await res.json();
      if (json.success && json.data) {
        setUser(json.data.user || null);
        setAvailableUsers(json.data.availableUsers || []);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error fetching auth session:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Si no está logueado y no está en /login, redirigir
  useEffect(() => {
    if (!isLoading) {
      if (!user && pathname !== '/login') {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/');
      }
    }
  }, [user, isLoading, pathname, router]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success && data.data?.user) {
        setUser(data.data.user);
        await fetchSession();
        router.push('/');
        return { success: true };
      }
      return { success: false, error: data.error || 'Credenciales inválidas' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error al conectar con el servidor' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      setUser(null);
      router.push('/login');
    }
  };

  const switchOperator = async (targetUserId: string, pin: string) => {
    try {
      const res = await fetch('/api/v1/auth/switch-operator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, pin }),
      });
      const data = await res.json();
      if (data.success && data.data?.user) {
        setUser(data.data.user);
        await fetchSession();
        return { success: true };
      }
      return { success: false, error: data.error || 'PIN incorrecto' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error al cambiar de operador' };
    }
  };

  const hasPermission = (module: AppModule): boolean => {
    if (!user) return false;
    return hasModulePermission(user.role, module);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        availableUsers,
        isLoading,
        login,
        logout,
        switchOperator,
        refreshSession: fetchSession,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

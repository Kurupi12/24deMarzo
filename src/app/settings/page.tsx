import React, { Suspense } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { SettingsView } from '@/components/modules/settings/settings-view';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Configuración & Permisos - Depósito 4 de Marzo',
  description: 'Gestión de usuarios, permisos por rol y flota de camiones de la empresa',
};

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            }
          >
            <SettingsView />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

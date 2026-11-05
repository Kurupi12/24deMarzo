import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { VehiclesManager } from '@/components/modules/settings/vehicles-manager';

export const metadata = {
  title: 'Configuración & Flota - Depósito 4 de Marzo',
  description: 'Gestión de flota de vehículos, camiones y parámetros del sistema',
};

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8">
          <VehiclesManager />
        </main>
      </div>
    </div>
  );
}


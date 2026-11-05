import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ReportsView } from '@/components/modules/reports/reports-view';

export const metadata = {
  title: 'Reportes & Obras - Depósito 4 de Marzo',
  description: 'Auditoría, trazabilidad de despachos y valorización de inventario',
};

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8">
          <ReportsView />
        </main>
      </div>
    </div>
  );
}

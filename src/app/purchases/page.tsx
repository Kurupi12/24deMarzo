import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { PurchasesView } from '@/components/modules/purchases/purchases-view';

export const metadata = {
  title: 'Compras a Proveedores - Depósito 4 de Marzo',
  description: 'Gestión de facturas de compra y entradas a stock oficial',
};

export default function PurchasesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8">
          <PurchasesView />
        </main>
      </div>
    </div>
  );
}

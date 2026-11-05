import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { BillingView } from '@/components/modules/billing/billing-view';

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8">
          <BillingView />
        </main>
      </div>
    </div>
  );
}

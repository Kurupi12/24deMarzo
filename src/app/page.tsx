import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { DashboardView } from '@/components/modules/dashboard/dashboard-view';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8">
          <DashboardView />
        </main>
      </div>
    </div>
  );
}

import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { HrView } from '@/components/modules/hr/hr-view';

export default function HrPage() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8">
          <HrView />
        </main>
      </div>
    </div>
  );
}

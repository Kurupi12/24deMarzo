import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { FleetView } from '@/components/modules/fleet/fleet-view';

export const dynamic = 'force-dynamic';

export default function FleetPage() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-6 lg:p-8">
          <FleetView />
        </main>
      </div>
    </div>
  );
}


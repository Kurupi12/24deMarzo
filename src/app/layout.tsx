import type { Metadata } from 'next';
import './globals.css';
import { QuickNumberProvider } from '@/components/common/quick-number-provider';

export const metadata: Metadata = {
  title: 'Core ERP Empresarial | Suite Operativa',
  description: 'Sistema centralizado de gestión para Inventario, Facturación SIFEN y Recursos Humanos',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-background text-foreground antialiased min-h-screen selection:bg-primary selection:text-white">
        <QuickNumberProvider />
        {children}
      </body>
    </html>
  );
}


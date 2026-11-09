import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const notifications: Array<{
      id: string;
      type: 'warning' | 'danger' | 'info' | 'success';
      title: string;
      message: string;
      link: string;
      linkText: string;
      createdAt: string;
    }> = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. Alerta: Pedidos programados para entregar HOY
    const scheduledToday = await prisma.sale.findMany({
      where: {
        isScheduled: true,
        deliveryStatus: 'PENDING_DELIVERY',
        scheduledDeliveryDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      select: {
        id: true,
        saleNumber: true,
        customerName: true,
        balanceDue: true,
      },
    });

    if (scheduledToday.length > 0) {
      const totalBalance = scheduledToday.reduce((sum, o) => sum + Number(o.balanceDue || 0), 0);
      notifications.push({
        id: 'scheduled-today',
        type: 'warning',
        title: `Entregas Programadas para HOY (${scheduledToday.length})`,
        message: `Hay ${scheduledToday.length} pedido(s) programado(s) para despachar hoy. Saldo a cobrar en obra: ₲ ${totalBalance.toLocaleString('es-PY')}.`,
        link: '/billing?tab=scheduled',
        linkText: 'Gestionar Entregas',
        createdAt: now.toISOString(),
      });
    }

    // 2. Alerta: Stock crítico bajo mínimo
    const criticalProducts = await prisma.stockItem.findMany({
      where: {
        currentStock: {
          lte: prisma.stockItem.fields.currentStock, // fallback
        },
      },
      include: {
        product: { select: { id: true, name: true, sku: true, minStockAlert: true } },
      },
      take: 10,
    });

    // Filtrar los que realmente estén por debajo de su alerta de stock mínimo
    const underStock = criticalProducts.filter(
      (item) => Number(item.currentStock) <= Number(item.product?.minStockAlert || 5)
    );

    if (underStock.length > 0) {
      notifications.push({
        id: 'critical-stock',
        type: 'danger',
        title: `Stock Crítico (${underStock.length} productos)`,
        message: `Materiales con existencia por debajo del nivel mínimo (${underStock.slice(0, 2).map(u => u.product.name).join(', ')}...).`,
        link: '/inventory',
        linkText: 'Ver Inventario',
        createdAt: now.toISOString(),
      });
    }

    // 3. Estado de Turno de Caja
    const openShift = await prisma.cashShift.findFirst({
      where: { isOpen: true },
      orderBy: { openedAt: 'desc' },
    });

    if (openShift) {
      notifications.push({
        id: 'open-cash-shift',
        type: 'info',
        title: 'Caja Mostrador Abierta',
        message: 'Turno habilitado y cobrando ventas activas en el mostrador central.',
        link: '/billing?tab=shifts',
        linkText: 'Ver Arqueo',
        createdAt: openShift.openedAt.toISOString(),
      });
    } else {
      notifications.push({
        id: 'no-open-shift',
        type: 'warning',
        title: 'Caja Cerrada',
        message: 'No hay turno de caja abierto en el mostrador. Abre un turno para comenzar a facturar.',
        link: '/billing?tab=shifts',
        linkText: 'Abrir Caja',
        createdAt: now.toISOString(),
      });
    }

    return NextResponse.json(
      createSuccessResponse({
        unreadCount: notifications.filter((n) => n.type === 'warning' || n.type === 'danger').length,
        totalCount: notifications.length,
        notifications,
      })
    );
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'NOTIFICATIONS_FETCH_ERROR'),
      { status: 500 }
    );
  }
}

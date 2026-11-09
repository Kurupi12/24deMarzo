import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); // 'today' | 'upcoming' | 'all' | 'history'

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const where: any = {
      isScheduled: true,
    };

    if (filter === 'today') {
      where.deliveryStatus = 'PENDING_DELIVERY';
      where.scheduledDeliveryDate = {
        gte: startOfToday,
        lte: endOfToday,
      };
    } else if (filter === 'upcoming') {
      where.deliveryStatus = 'PENDING_DELIVERY';
      where.scheduledDeliveryDate = {
        gt: endOfToday,
      };
    } else if (filter === 'pending') {
      where.deliveryStatus = 'PENDING_DELIVERY';
    } else if (filter === 'history') {
      where.deliveryStatus = 'DELIVERED';
    }

    const orders = await prisma.sale.findMany({
      where,
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } },
          },
        },
        driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
        project: { select: { id: true, name: true, address: true } },
        invoice: { select: { id: true, invoiceNumber: true, sifenStatus: true, cdc: true } },
      },
      orderBy: [
        { scheduledDeliveryDate: 'asc' },
        { createdAt: 'desc' },
      ],
      take: 100,
    });

    // Conteo de alertas para HOY
    const todayAlertCount = await prisma.sale.count({
      where: {
        isScheduled: true,
        deliveryStatus: 'PENDING_DELIVERY',
        scheduledDeliveryDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    const totalPendingCount = await prisma.sale.count({
      where: {
        isScheduled: true,
        deliveryStatus: 'PENDING_DELIVERY',
      },
    });

    return NextResponse.json(
      createSuccessResponse({
        orders,
        alerts: {
          todayCount: todayAlertCount,
          totalPendingCount,
          hasDeliveriesToday: todayAlertCount > 0,
        },
      })
    );
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'SCHEDULED_ORDERS_FETCH_ERROR'),
      { status: 500 }
    );
  }
}

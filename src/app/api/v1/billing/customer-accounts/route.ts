import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ruc = searchParams.get('ruc');

    if (ruc) {
      // Detalle y estado de cuenta de un cliente específico
      const customer = await prisma.customer.findUnique({
        where: { ruc },
      });

      const orders = await prisma.sale.findMany({
        where: {
          customerRuc: ruc,
          paymentCondition: { in: ['A_CUENTA', 'CREDITO'] },
        },
        include: {
          items: { include: { product: true } },
          invoice: true,
          project: true,
          driver: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const payments = await prisma.customerPayment.findMany({
        where: { customerRuc: ruc },
        orderBy: { createdAt: 'desc' },
      });

      const totalDelivered = orders.reduce((sum, o) => sum + Number(o.grandTotal), 0);
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const currentBalance = totalDelivered - totalPaid;

      return NextResponse.json(
        createSuccessResponse({
          customer: customer || { name: orders[0]?.customerName || 'Cliente', ruc },
          totalDelivered,
          totalPaid,
          currentBalance,
          orders,
          payments,
        })
      );
    }

    // Listado general de cuentas corrientes con pedidos o pagos
    const orders = await prisma.sale.findMany({
      where: {
        paymentCondition: { in: ['A_CUENTA', 'CREDITO'] },
      },
      select: {
        customerRuc: true,
        customerName: true,
        customerAddress: true,
        grandTotal: true,
        createdAt: true,
      },
    });

    const payments = await prisma.customerPayment.findMany({
      select: {
        customerRuc: true,
        customerName: true,
        amount: true,
        createdAt: true,
      },
    });

    // Agrupar por RUC de cliente
    const accountsMap = new Map<
      string,
      {
        customerRuc: string;
        customerName: string;
        customerAddress: string | null;
        totalDelivered: number;
        totalPaid: number;
        currentBalance: number;
        ordersCount: number;
        paymentsCount: number;
        lastActivity: Date;
      }
    >();

    for (const o of orders) {
      const r = o.customerRuc;
      const existing = accountsMap.get(r) || {
        customerRuc: r,
        customerName: o.customerName,
        customerAddress: o.customerAddress,
        totalDelivered: 0,
        totalPaid: 0,
        currentBalance: 0,
        ordersCount: 0,
        paymentsCount: 0,
        lastActivity: o.createdAt,
      };

      existing.totalDelivered += Number(o.grandTotal);
      existing.ordersCount += 1;
      if (new Date(o.createdAt) > new Date(existing.lastActivity)) {
        existing.lastActivity = o.createdAt;
      }
      accountsMap.set(r, existing);
    }

    for (const p of payments) {
      const r = p.customerRuc;
      const existing = accountsMap.get(r) || {
        customerRuc: r,
        customerName: p.customerName,
        customerAddress: null,
        totalDelivered: 0,
        totalPaid: 0,
        currentBalance: 0,
        ordersCount: 0,
        paymentsCount: 0,
        lastActivity: p.createdAt,
      };

      existing.totalPaid += Number(p.amount);
      existing.paymentsCount += 1;
      if (new Date(p.createdAt) > new Date(existing.lastActivity)) {
        existing.lastActivity = p.createdAt;
      }
      accountsMap.set(r, existing);
    }

    const accounts = Array.from(accountsMap.values()).map((acc) => ({
      ...acc,
      currentBalance: acc.totalDelivered - acc.totalPaid,
    }));

    return NextResponse.json(createSuccessResponse(accounts));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'CUSTOMER_ACCOUNTS_FETCH_ERROR'),
      { status: 500 }
    );
  }
}


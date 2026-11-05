import { prisma } from '@/lib/prisma';
import { SaleFilterParams } from '../types/billing.types';

export class BillingRepository {
  async findSales(params: SaleFilterParams) {
    const { search, startDate, endDate, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { saleNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerRuc: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [total, items] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        skip,
        take: limit,
        include: {
          items: { include: { product: true } },
          invoice: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, items, page, limit };
  }

  async findSaleById(id: string) {
    return prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        invoice: true,
        user: { select: { id: true, name: true } },
      },
    });
  }

  async getLatestSaleNumber(): Promise<string> {
    const lastSale = await prisma.sale.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { saleNumber: true },
    });

    if (!lastSale) return 'VTA-0000001';
    const match = lastSale.saleNumber.match(/\d+$/);
    const seq = match ? parseInt(match[0], 10) + 1 : 1;
    return `VTA-${seq.toString().padStart(7, '0')}`;
  }

  async getTodaySalesTotal(): Promise<{ count: number; totalAmount: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const aggregates = await prisma.sale.aggregate({
      where: {
        createdAt: { gte: today },
        status: 'COMPLETED',
      },
      _count: { id: true },
      _sum: { grandTotal: true },
    });

    return {
      count: aggregates._count.id,
      totalAmount: Number(aggregates._sum.grandTotal || 0),
    };
  }
}


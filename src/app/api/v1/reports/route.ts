import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'sales_by_project';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const customerRuc = searchParams.get('customerRuc') || undefined;
    const driverId = searchParams.get('driverId') || undefined;

    const dateFilter: any = {};
    if (startDateParam) dateFilter.gte = new Date(startDateParam);
    if (endDateParam) {
      const end = new Date(endDateParam);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    if (type === 'sales_by_project') {
      // 1. Reporte: Ventas por Cliente y por Obra
      const where: any = { status: 'COMPLETED' };
      if (startDateParam || endDateParam) where.createdAt = dateFilter;
      if (customerRuc) where.customerRuc = customerRuc;

      const sales = await prisma.sale.findMany({
        where,
        include: {
          project: true,
          driver: { select: { id: true, firstName: true, lastName: true } },
          invoice: { select: { invoiceNumber: true, sifenStatus: true, cdc: true } },
          items: {
            include: {
              product: { select: { sku: true, name: true, unitOfMeasure: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Agrupación analítica por cliente y obra
      const groupedClients: Record<string, {
        customerName: string;
        customerRuc: string;
        totalAmount: number;
        salesCount: number;
        projects: Record<string, {
          projectName: string;
          projectAddress: string;
          totalAmount: number;
          salesCount: number;
          sales: any[];
        }>;
      }> = {};

      for (const sale of sales) {
        if (!groupedClients[sale.customerRuc]) {
          groupedClients[sale.customerRuc] = {
            customerName: sale.customerName,
            customerRuc: sale.customerRuc,
            totalAmount: 0,
            salesCount: 0,
            projects: {},
          };
        }

        const clientGroup = groupedClients[sale.customerRuc];
        const projKey = sale.project ? sale.project.id : 'SIN_OBRA';
        const projName = sale.project ? sale.project.name : 'Venta General / Mostrador (Sin Obra Asignada)';
        const projAddress = sale.project ? sale.project.address : (sale.customerAddress || 'Retiro en Local');

        if (!clientGroup.projects[projKey]) {
          clientGroup.projects[projKey] = {
            projectName: projName,
            projectAddress: projAddress,
            totalAmount: 0,
            salesCount: 0,
            sales: [],
          };
        }

        const saleTotal = Number(sale.grandTotal);
        clientGroup.totalAmount += saleTotal;
        clientGroup.salesCount += 1;

        clientGroup.projects[projKey].totalAmount += saleTotal;
        clientGroup.projects[projKey].salesCount += 1;
        clientGroup.projects[projKey].sales.push({
          id: sale.id,
          saleNumber: sale.saleNumber,
          invoiceNumber: sale.invoice?.invoiceNumber || '-',
          createdAt: sale.createdAt,
          paymentCondition: sale.paymentCondition,
          grandTotal: saleTotal,
          deliveryStatus: sale.deliveryStatus,
          driverName: sale.driver ? `${sale.driver.firstName} ${sale.driver.lastName}` : 'Mostrador / Propio',
          vehiclePlate: sale.vehiclePlate || '-',
          itemsCount: sale.items.length,
          items: sale.items.map((it) => ({
            name: it.product.name,
            sku: it.product.sku,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            subtotal: Number(it.subtotal),
          })),
        });
      }

      return NextResponse.json(
        createSuccessResponse({
          reportType: 'sales_by_project',
          totalSales: sales.length,
          grandTotalAmount: sales.reduce((acc, s) => acc + Number(s.grandTotal), 0),
          clients: Object.values(groupedClients).map((c) => ({
            ...c,
            projects: Object.values(c.projects),
          })),
        })
      );
    }

    if (type === 'deliveries_by_driver') {
      // 2. Reporte: Trazabilidad de Despachos por Chofer / Ayudantes
      const where: any = {};
      if (startDateParam || endDateParam) where.createdAt = dateFilter;
      if (driverId) where.driverId = driverId;

      const [sales, employees] = await Promise.all([
        prisma.sale.findMany({
          where,
          include: {
            driver: true,
            secondaryDriver: true,
            project: true,
            invoice: { select: { invoiceNumber: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.employee.findMany({
          where: { status: 'ACTIVE' },
          select: { id: true, firstName: true, lastName: true, code: true, jobTitle: true },
        }),
      ]);

      const empMap = new Map(employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]));

      const deliveries = sales.map((s) => ({
        id: s.id,
        saleNumber: s.saleNumber,
        invoiceNumber: s.invoice?.invoiceNumber || '-',
        date: s.createdAt,
        customerName: s.customerName,
        customerRuc: s.customerRuc,
        projectName: s.project?.name || 'Entrega en Obra / Dirección Cliente',
        destinationAddress: s.project?.address || s.customerAddress || 'No especificada',
        driverName: s.driver ? `${s.driver.firstName} ${s.driver.lastName}` : 'Sin Chofer Asignado',
        driverCode: s.driver?.code || '-',
        helpers: (s.helperIds || []).map((hId) => empMap.get(hId) || hId),
        vehiclePlate: s.vehiclePlate || 'Furgón 4M',
        secondaryDriverName: s.secondaryDriver ? `${s.secondaryDriver.firstName} ${s.secondaryDriver.lastName}` : null,
        secondaryVehiclePlate: s.secondaryVehiclePlate || null,
        secondaryHelpers: (s.secondaryHelperIds || []).map((hId) => empMap.get(hId) || hId),
        deliveryStatus: s.deliveryStatus,
        deliveryNotes: s.deliveryNotes || '',
        grandTotal: Number(s.grandTotal),
      }));

      return NextResponse.json(
        createSuccessResponse({
          reportType: 'deliveries_by_driver',
          totalDeliveries: deliveries.length,
          deliveries,
        })
      );
    }

    if (type === 'kardex_valuation') {
      // 3. Reporte: Kardex y Valorización de Inventario
      const products = await prisma.product.findMany({
        where: { isActive: true },
        include: {
          stockItems: true,
        },
        orderBy: { name: 'asc' },
      });

      let totalStockCount = 0;
      let totalCostValuation = 0;
      let totalSaleValuation = 0;

      const rows = products.map((p) => {
        const stock = p.stockItems.reduce((acc, it) => acc + Number(it.currentStock), 0);
        const costPrice = Number(p.costPrice);
        const salePrice = Number(p.salePrice);
        const totalCost = stock * costPrice;
        const totalSale = stock * salePrice;
        const margin = salePrice > 0 ? ((salePrice - costPrice) / salePrice) * 100 : 0;

        totalStockCount += stock;
        totalCostValuation += totalCost;
        totalSaleValuation += totalSale;

        return {
          id: p.id,
          sku: p.sku,
          barcode: p.barcode || '-',
          name: p.name,
          unitOfMeasure: p.unitOfMeasure,
          currentStock: stock,
          minStockAlert: Number(p.minStockAlert),
          costPrice,
          salePrice,
          totalCostValuation: totalCost,
          totalSaleValuation: totalSale,
          estimatedProfit: totalSale - totalCost,
          marginPercent: Math.round(margin * 10) / 10,
        };
      });

      return NextResponse.json(
        createSuccessResponse({
          reportType: 'kardex_valuation',
          totalSkus: rows.length,
          totalUnits: totalStockCount,
          totalCostValuation,
          totalSaleValuation,
          projectedProfit: totalSaleValuation - totalCostValuation,
          items: rows,
        })
      );
    }

    if (type === 'price_list') {
      // 4. Reporte: Lista Oficial de Precios
      const products = await prisma.product.findMany({
        where: { isActive: true },
        include: { stockItems: true },
        orderBy: { name: 'asc' },
      });

      const list = products.map((p) => {
        const stock = p.stockItems.reduce((acc, it) => acc + Number(it.currentStock), 0);
        return {
          id: p.id,
          sku: p.sku,
          barcode: p.barcode || '-',
          name: p.name,
          unitOfMeasure: p.unitOfMeasure,
          vatRate: p.vatRate,
          salePrice: Number(p.salePrice),
          costPrice: Number(p.costPrice),
          currentStock: stock,
          isAvailable: stock > 0,
        };
      });

      return NextResponse.json(
        createSuccessResponse({
          reportType: 'price_list',
          totalProducts: list.length,
          products: list,
        })
      );
    }

    return NextResponse.json(
      createErrorResponse('Tipo de reporte desconocido', 'INVALID_REPORT_TYPE'),
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'REPORTS_FETCH_ERROR'),
      { status: 500 }
    );
  }
}


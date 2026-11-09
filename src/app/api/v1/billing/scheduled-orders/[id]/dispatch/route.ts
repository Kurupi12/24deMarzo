import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { generateSifenCdc } from '@/shared/utils/cdc-generator';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const saleId = params.id;
    const body = await req.json().catch(() => ({}));
    const {
      driverId,
      vehiclePlate,
      helperIds = [],
      balancePaymentMethod = 'EFECTIVO',
      balancePaymentReference,
      issueInvoice = true,
    } = body;

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: true,
        invoice: true,
      },
    });

    if (!sale) {
      return NextResponse.json(createErrorResponse('Pedido no encontrado', 'NOT_FOUND'), { status: 404 });
    }

    if (sale.deliveryStatus === 'DELIVERED') {
      return NextResponse.json(
        createErrorResponse('Este pedido ya fue despachado y entregado previamente', 'ALREADY_DELIVERED'),
        { status: 400 }
      );
    }

    const warehouse = await prisma.warehouse.findFirst({ where: { isMain: true } });

    // Buscar turno de caja abierto para registrar el saldo cobrado
    const openShift = await prisma.cashShift.findFirst({
      where: { isOpen: true },
      orderBy: { openedAt: 'desc' },
      select: { id: true },
    });

    // Ejecutar transacción atómica de despacho
    const updatedSale = await prisma.$transaction(async (tx) => {
      // 1. Deducir stock reservado y stock físico con movimiento Kardex
      if (warehouse) {
        for (const item of sale.items) {
          const stockItem = await tx.stockItem.findUnique({
            where: { productId_warehouseId: { productId: item.productId, warehouseId: warehouse.id } },
          });

          if (stockItem) {
            const prevStock = Number(stockItem.currentStock || 0);
            const prevReserved = Number(stockItem.reservedStock || 0);

            const itemQty = Number(item.quantity);
            const newStock = Math.max(0, prevStock - itemQty);
            const newReserved = Math.max(0, prevReserved - itemQty);

            await tx.stockItem.update({
              where: { id: stockItem.id },
              data: {
                currentStock: newStock,
                reservedStock: newReserved,
              },
            });

            await tx.stockMovement.create({
              data: {
                movementType: 'OUT_SALE',
                productId: item.productId,
                warehouseId: warehouse.id,
                quantity: item.quantity,
                unitCost: Number(item.unitPrice) * 0.7,
                totalCost: Number(item.quantity) * Number(item.unitPrice) * 0.7,
                previousStock: prevStock,
                newStock: newStock,
                referenceType: 'FACTURA_VENTA',
                referenceId: sale.id,
                notes: `Despacho de pedido programado a ${sale.customerName}`,
                userId: sale.userId,
              },
            });
          }
        }
      }

      // 2. Si tenía saldo pendiente y se cobra ahora, registrar ingreso en caja si es efectivo
      const balanceToPay = Number(sale.balanceDue || 0);
      if (balanceToPay > 0 && openShift && balancePaymentMethod === 'EFECTIVO') {
        // Ingreso por cobro de saldo
        await tx.customerPayment.create({
          data: {
            receiptNumber: `REC-SALDO-${sale.saleNumber.replace(/\D/g, '')}`,
            customerRuc: sale.customerRuc,
            customerName: sale.customerName,
            amount: balanceToPay,
            paymentMethod: balancePaymentMethod,
            paymentReference: balancePaymentReference || null,
            cashShiftId: openShift.id,
            notes: `Cobro de saldo contra entrega de pedido ${sale.saleNumber}`,
            userId: sale.userId,
          },
        });
      }

      // 3. Generar factura electrónica SIFEN si se solicitó y no existía factura previa
      if (issueInvoice && !sale.invoice) {
        const invoiceSeq = parseInt(sale.saleNumber.replace(/\D/g, ''), 10) || 1;
        const invoiceNumber = `001-001-${invoiceSeq.toString().padStart(7, '0')}`;
        const cdc = generateSifenCdc({ secuencia: invoiceSeq, issueDate: new Date() });

        await tx.invoice.create({
          data: {
            saleId: sale.id,
            invoiceNumber,
            dteType: 'FACTURA_ELECTRONICA',
            cdc,
            sifenStatus: 'APPROVED',
            qrCodeUrl: `https://sifen.set.gov.py/consultas/qr?nVersion=150&IdGESIFEN=${cdc}`,
          },
        });
      }

      // 4. Actualizar estado de la venta
      return tx.sale.update({
        where: { id: sale.id },
        data: {
          deliveryStatus: 'DELIVERED',
          status: 'COMPLETED',
          balanceDue: 0,
          driverId: driverId || sale.driverId,
          vehiclePlate: vehiclePlate || sale.vehiclePlate,
          helperIds: helperIds.length > 0 ? helperIds : sale.helperIds,
          cashShiftId: openShift?.id || sale.cashShiftId,
        },
        include: {
          items: { include: { product: true } },
          invoice: true,
          driver: true,
          project: true,
        },
      });
    });

    return NextResponse.json(createSuccessResponse(updatedSale));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'DISPATCH_PROCESS_ERROR'),
      { status: 500 }
    );
  }
}

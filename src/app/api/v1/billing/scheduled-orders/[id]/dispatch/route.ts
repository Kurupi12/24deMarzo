import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { generateSifenCdc } from '@/shared/utils/cdc-generator';
import { requireOpenCashShift } from '@/modules/billing/utils/cash-movement-sync';
import { AppError } from '@/shared/errors/app-error';

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
      issueInvoice = false,
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

    const isDeferredToLibreta = balancePaymentMethod === 'A_CUENTA';
    const balanceToPay = Number(sale.balanceDue || 0);
    const downPaymentPaid = Number(sale.downPayment || 0);

    // Exigir turno de caja abierto cuando se cobra dinero en efectivo/pago contra entrega
    const openShift =
      !isDeferredToLibreta && balanceToPay > 0
        ? await requireOpenCashShift(prisma)
        : await prisma.cashShift.findFirst({
            where: { isOpen: true },
            orderBy: { openedAt: 'desc' },
            select: { id: true, openedAt: true },
          });

    // Ejecutar transacción atómica de despacho
    const updatedSale = await prisma.$transaction(
      async (tx) => {
        // 1. Deducir stock reservado y stock físico con movimiento Kardex
        if (warehouse) {
          const productIds = sale.items.map((item) => item.productId);
          const stockItems = await tx.stockItem.findMany({
            where: {
              warehouseId: warehouse.id,
              productId: { in: productIds },
            },
          });
          const stockMap = new Map(stockItems.map((si) => [si.productId, si]));

          for (const item of sale.items) {
            const stockItem = stockMap.get(item.productId);

            if (stockItem) {
              const prevStock = Number(stockItem.currentStock || 0);
              const prevReserved = Number(stockItem.reservedStock || 0);

              const itemQty = Number(item.quantity);
              const newStock = prevStock - itemQty;
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
                  referenceType: 'DESPACHO_PROGRAMADO',
                  referenceId: sale.id,
                  notes: `Despacho de pedido programado a ${sale.customerName}`,
                  userId: sale.userId,
                },
              });
            }
          }
        }

        // 2. Manejo de cobro de saldo al entregar (si había seña previa en otro turno y paga saldo en efectivo ahora, sumar a caja sin duplicar libreta)
        if (!isDeferredToLibreta && balanceToPay > 0 && downPaymentPaid > 0 && openShift && balancePaymentMethod === 'EFECTIVO') {
          await tx.cashMovement.create({
            data: {
              cashShiftId: openShift.id,
              type: 'INCOME_CHANGE',
              category: 'COBRO_SALDO_RESERVA',
              amount: balanceToPay,
              description: `Cobro saldo contra entrega ${sale.saleNumber} (${sale.customerName})`,
              beneficiary: sale.customerName,
              receiptNo: sale.saleNumber,
            },
          });
        }

        // 3. Generar factura electrónica SIFEN solo si se solicitó explícitamente y no existía factura previa
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

        // 4. Actualizar estado de la venta (respetando Libreta / A_CUENTA si paga a fin de semana)
        const nextPaymentCondition = isDeferredToLibreta
          ? 'A_CUENTA'
          : sale.paymentCondition === 'A_CUENTA'
          ? 'CONTADO'
          : sale.paymentCondition;

        const nextPaymentMethod = isDeferredToLibreta ? sale.paymentMethod : (balancePaymentMethod as any);
        const nextCashShiftId =
          isDeferredToLibreta || downPaymentPaid > 0
            ? sale.cashShiftId
            : openShift?.id || sale.cashShiftId;

        return tx.sale.update({
          where: { id: sale.id },
          data: {
            deliveryStatus: 'DELIVERED',
            status: 'COMPLETED',
            paymentCondition: nextPaymentCondition,
            paymentMethod: nextPaymentMethod,
            paymentReference: !isDeferredToLibreta && balancePaymentReference ? balancePaymentReference : sale.paymentReference,
            balanceDue: isDeferredToLibreta ? balanceToPay : 0,
            driverId: driverId || sale.driverId,
            vehiclePlate: vehiclePlate || sale.vehiclePlate,
            helperIds: helperIds.length > 0 ? helperIds : sale.helperIds,
            cashShiftId: nextCashShiftId,
          },
          include: {
            items: { include: { product: true } },
            invoice: true,
            driver: true,
            project: true,
          },
        });
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );

    return NextResponse.json(createSuccessResponse(updatedSale));
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        createErrorResponse(error.message, error.code || 'DISPATCH_PROCESS_ERROR'),
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      createErrorResponse(error.message, 'DISPATCH_PROCESS_ERROR'),
      { status: 500 }
    );
  }
}

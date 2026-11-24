import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { resolveCustomerRuc, syncCustomerMaster } from '@/modules/billing/utils/customer-identity';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const saleId = params.id;
    const body = await req.json();
    const {
      customerName,
      customerRuc,
      customerAddress,
      googleMapsUrl,
      deliveryNotes,
      paymentReference,
      projectId,
      status,
    } = body;

    const existingSale = await prisma.sale.findUnique({
      where: { id: saleId },
    });

    if (!existingSale) {
      return NextResponse.json(createErrorResponse('Comprobante no encontrado', 'NOT_FOUND'), { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextName =
        customerName !== undefined
          ? String(customerName).trim() || 'Sin Nombre (Consumidor Final)'
          : existingSale.customerName;
      const nextRuc =
        customerRuc !== undefined
          ? await resolveCustomerRuc(tx, {
              customerRuc: String(customerRuc),
              customerName: nextName,
            })
          : existingSale.customerRuc;
      const nextAddress =
        customerAddress !== undefined ? (String(customerAddress).trim() || null) : existingSale.customerAddress;
      const nextMaps =
        googleMapsUrl !== undefined ? (String(googleMapsUrl).trim() || null) : existingSale.googleMapsUrl;

      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          customerName: nextName,
          customerRuc: nextRuc,
          customerAddress: nextAddress,
          googleMapsUrl: nextMaps,
          deliveryNotes:
            deliveryNotes !== undefined ? (String(deliveryNotes).trim() || null) : existingSale.deliveryNotes,
          paymentReference:
            paymentReference !== undefined
              ? (String(paymentReference).trim() || null)
              : existingSale.paymentReference,
          projectId: projectId !== undefined ? (projectId || null) : existingSale.projectId,
          ...(status ? { status } : {}),
        },
        include: {
          items: { include: { product: true } },
          invoice: true,
          project: true,
          driver: true,
          secondaryDriver: true,
        },
      });

      // Sincronizar también en el maestro de clientes si no es Consumidor Final genérico
      await syncCustomerMaster(tx, {
        ruc: nextRuc,
        name: nextName,
        address: nextAddress,
        googleMapsUrl: nextMaps,
      });

      return updatedSale;
    });

    return NextResponse.json(createSuccessResponse(updated));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message || 'Error al actualizar comprobante', 'SALE_UPDATE_ERROR'),
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawReason = String(body?.reason || '').trim();
    const sessionUser = await getSessionUser();

    const sale = await prisma.sale.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        invoice: true,
      },
    });

    if (!sale) {
      return NextResponse.json(createErrorResponse('Registro no encontrado', 'NOT_FOUND'), { status: 404 });
    }

    if (sale.status === 'QUOTATION') {
      await prisma.sale.delete({ where: { id: params.id } });
      return NextResponse.json(createSuccessResponse({ deleted: true, mode: 'QUOTATION_DELETED' }));
    }

    if (sale.status === 'CANCELLED') {
      return NextResponse.json(
        createErrorResponse('Este pedido ya fue anulado previamente.', 'ALREADY_CANCELLED'),
        { status: 400 }
      );
    }

    if (sale.invoice) {
      return NextResponse.json(
        createErrorResponse(
          'Este pedido ya tiene Factura Electrónica SIFEN emitida y no puede anularse desde libreta.',
          'INVOICED_FORBIDDEN'
        ),
        { status: 400 }
      );
    }

    if (sale.paymentCondition !== 'A_CUENTA' && sale.paymentCondition !== 'CREDITO') {
      return NextResponse.json(
        createErrorResponse('Solo se pueden anular pedidos de cuenta corriente / libreta sin facturar.', 'FORBIDDEN'),
        { status: 400 }
      );
    }

    const cleanReason = rawReason || 'Pedido cancelado o no entregado desde libreta';
    let actorId = sessionUser?.id;
    let actorLabel = sessionUser ? `${sessionUser.name} (${sessionUser.role})` : '';
    if (!actorId) {
      const fallbackUser = await prisma.user.findFirst({ select: { id: true, name: true, role: true } });
      actorId = fallbackUser?.id || sale.userId;
      actorLabel = fallbackUser ? `${fallbackUser.name} (${fallbackUser.role})` : 'Operador Mostrador';
    }

    const cancelledAtStr = new Date().toLocaleString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const auditStamp = `[ANULADO el ${cancelledAtStr} por ${actorLabel} | Motivo: ${cleanReason}]`;
    const nextDeliveryNotes = [sale.deliveryNotes?.trim(), auditStamp].filter(Boolean).join(' — ');

    const cancelledSale = await prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.findFirst({ where: { isMain: true } });

      if (warehouse && sale.items.length > 0) {
        const productIds = sale.items.map((it) => it.productId);
        const stockItems = await tx.stockItem.findMany({
          where: {
            warehouseId: warehouse.id,
            productId: { in: productIds },
          },
        });
        const stockMap = new Map(stockItems.map((si) => [si.productId, si]));

        const wasOnlyReserved = sale.isScheduled && sale.deliveryStatus !== 'DELIVERED';

        for (const item of sale.items) {
          const stockItem = stockMap.get(item.productId);
          if (!stockItem) continue;

          const qty = Number(item.quantity);

          if (wasOnlyReserved) {
            const prevReserved = Number(stockItem.reservedStock || 0);
            await tx.stockItem.update({
              where: { id: stockItem.id },
              data: { reservedStock: Math.max(0, prevReserved - qty) },
            });
          } else {
            const prevStock = Number(stockItem.currentStock || 0);
            const newStock = prevStock + qty;

            await tx.stockItem.update({
              where: { id: stockItem.id },
              data: { currentStock: newStock },
            });

            await tx.stockMovement.create({
              data: {
                movementType: 'ADJUSTMENT_POSITIVE',
                productId: item.productId,
                warehouseId: warehouse.id,
                quantity: qty,
                unitCost: Number(item.unitPrice) * 0.7,
                totalCost: qty * Number(item.unitPrice) * 0.7,
                previousStock: prevStock,
                newStock,
                referenceType: 'ANULACION_LIBRETA',
                referenceId: sale.id,
                notes: `Devolución de stock por anulación de pedido en libreta ${sale.saleNumber} (${actorLabel}): ${cleanReason}`,
                userId: actorId,
              },
            });
          }
        }
      }

      return tx.sale.update({
        where: { id: sale.id },
        data: {
          status: 'CANCELLED',
          balanceDue: 0,
          deliveryNotes: nextDeliveryNotes,
        },
        include: {
          items: { include: { product: true } },
          project: true,
        },
      });
    });

    return NextResponse.json(
      createSuccessResponse({
        deleted: true,
        mode: 'LIBRETA_CANCELLED_STOCK_RESTORED',
        sale: cancelledSale,
      })
    );
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message || 'Error al anular registro', 'SALE_DELETE_ERROR'),
      { status: 500 }
    );
  }
}

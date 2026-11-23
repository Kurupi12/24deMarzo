import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { resolveCustomerRuc, syncCustomerMaster } from '@/modules/billing/utils/customer-identity';

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
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sale = await prisma.sale.findUnique({ where: { id: params.id } });
    if (!sale) {
      return NextResponse.json(createErrorResponse('Registro no encontrado', 'NOT_FOUND'), { status: 404 });
    }
    if (sale.status !== 'QUOTATION') {
      return NextResponse.json(
        createErrorResponse('Solo se pueden eliminar presupuestos sin facturar.', 'FORBIDDEN'),
        { status: 400 }
      );
    }

    await prisma.sale.delete({ where: { id: params.id } });
    return NextResponse.json(createSuccessResponse({ deleted: true }));
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message || 'Error al eliminar presupuesto', 'QUOTATION_DELETE_ERROR'),
      { status: 500 }
    );
  }
}

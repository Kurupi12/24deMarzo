import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { purchaseNumber: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { supplierName: { contains: search, mode: 'insensitive' } },
        { supplierRuc: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.purchase.count({ where }),
      prisma.purchase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { purchaseDate: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, sku: true, name: true, unitOfMeasure: true },
              },
            },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ]);

    return NextResponse.json(
      createSuccessResponse(items, {
        page,
        limit,
        total,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'PURCHASES_FETCH_ERROR'),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      invoiceNumber,
      supplierRuc,
      supplierName,
      paymentCondition = 'CONTADO',
      items,
      notes,
    } = body;

    if (!invoiceNumber || !supplierRuc || !supplierName || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        createErrorResponse('Factura, RUC, Proveedor e ítems son obligatorios', 'VALIDATION_ERROR'),
        { status: 422 }
      );
    }

    // Calcular totales
    let grandTotal = 0;
    let vatAmount = 0;

    const validatedItems = items.map((item: any) => {
      const qty = Number(item.quantity);
      const unitCost = Number(item.unitCost);
      const subtotal = qty * unitCost;
      const vatRate = item.vatRate || 'IVA_10';
      const itemVat = vatRate === 'IVA_10' ? Math.round(subtotal / 11) : vatRate === 'IVA_5' ? Math.round(subtotal / 21) : 0;
      
      grandTotal += subtotal;
      vatAmount += itemVat;

      return {
        productId: item.productId,
        quantity: qty,
        unitCost,
        subtotal,
        vatRate,
      };
    });

    // Encontrar o crear usuario fallback
    const systemUser = await prisma.user.findFirst();
    const userId = systemUser ? systemUser.id : 'system-admin';

    // Generar correlativo de compra: COM-0001
    const lastPurchase = await prisma.purchase.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { purchaseNumber: true },
    });
    let seq = 1;
    if (lastPurchase) {
      const match = lastPurchase.purchaseNumber.match(/\d+$/);
      if (match) seq = parseInt(match[0], 10) + 1;
    }
    const purchaseNumber = `COM-${seq.toString().padStart(5, '0')}`;

    // Transacción atómica en Neon
    const result = await prisma.$transaction(async (tx) => {
      const mainWarehouse = await tx.warehouse.findFirst({ where: { isMain: true } });
      const warehouseId = mainWarehouse ? mainWarehouse.id : (await tx.warehouse.findFirst())?.id;

      if (!warehouseId) {
        throw new Error('No se encontró un depósito activo para ingresar mercadería.');
      }

      // Upsert o vincular proveedor en el maestro
      const supplierRecord = await tx.supplier.upsert({
        where: { ruc: supplierRuc.trim() },
        update: { name: supplierName.trim() },
        create: {
          ruc: supplierRuc.trim(),
          name: supplierName.trim(),
        },
      });

      // 1. Crear comprobante de compra
      const purchase = await tx.purchase.create({
        data: {
          purchaseNumber,
          invoiceNumber: invoiceNumber.trim(),
          supplierId: supplierRecord.id,
          supplierRuc: supplierRuc.trim(),
          supplierName: supplierName.trim(),
          paymentCondition: paymentCondition as any,
          subtotal: grandTotal - vatAmount,
          vatAmount,
          grandTotal,
          notes: notes ? notes.trim() : null,
          userId,
          status: 'COMPLETED',
          items: {
            create: validatedItems.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitCost: i.unitCost,
              subtotal: i.subtotal,
              vatRate: i.vatRate as any,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // 2. Incrementar stock en almacén, actualizar costo y registrar Kardex
      for (const item of validatedItems) {
        let stockItem = await tx.stockItem.findUnique({
          where: { productId_warehouseId: { productId: item.productId, warehouseId } },
        });

        const prevStock = Number(stockItem?.currentStock || 0);
        const newStock = prevStock + item.quantity;

        if (stockItem) {
          await tx.stockItem.update({
            where: { id: stockItem.id },
            data: { currentStock: newStock },
          });
        } else {
          await tx.stockItem.create({
            data: {
              productId: item.productId,
              warehouseId,
              currentStock: newStock,
              reservedStock: 0,
            },
          });
        }

        // Obtener costo actual del producto antes de la compra para cálculo de PPP
        const currentProduct = await tx.product.findUnique({
          where: { id: item.productId },
          select: { costPrice: true, name: true },
        });

        const prevCost = Number(currentProduct?.costPrice || 0);
        let weightedCost = item.unitCost;

        if (prevStock > 0 && prevCost > 0) {
          // Fórmula oficial de Precio Promedio Ponderado (PPP):
          // [(Stock_Previo * Costo_Previo) + (Cantidad_Comprada * Costo_Nuevo)] / (Stock_Previo + Cantidad_Comprada)
          const totalPrevValue = prevStock * prevCost;
          const totalNewValue = item.quantity * item.unitCost;
          const totalUnits = prevStock + item.quantity;
          weightedCost = Math.round((totalPrevValue + totalNewValue) / totalUnits);
        }

        // Actualizar costo del producto con el Precio Promedio Ponderado (PPP)
        await tx.product.update({
          where: { id: item.productId },
          data: { costPrice: weightedCost },
        });

        // Kardex Entrada con detalle del lote y nuevo PPP
        await tx.stockMovement.create({
          data: {
            movementType: 'IN_PURCHASE',
            productId: item.productId,
            warehouseId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.subtotal,
            previousStock: prevStock,
            newStock,
            referenceType: 'FACTURA_COMPRA',
            referenceId: purchase.invoiceNumber,
            notes: `Entrada compra a ${purchase.supplierName} (${purchase.purchaseNumber}) - Costo lote: Gs. ${item.unitCost.toLocaleString('es-PY')} | Nuevo PPP: Gs. ${weightedCost.toLocaleString('es-PY')}`,
            userId,
          },
        });
      }

      return purchase;
    });

    return NextResponse.json(createSuccessResponse(result), { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'PURCHASE_PROCESS_ERROR'),
      { status: 500 }
    );
  }
}


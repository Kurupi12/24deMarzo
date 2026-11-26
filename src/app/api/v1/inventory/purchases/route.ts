import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { getSessionUser } from '@/lib/auth/session';
import { recordCashOutflowOnOpenShift } from '@/modules/billing/utils/cash-movement-sync';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function parsePurchaseAudit(notes: string | null) {
  const raw = notes || '';
  const userMatch = raw.match(/\[USER:([^\]]+)\]/);
  const cashMatch = raw.match(/\[CASH_MOV:([^\]]+)\]/);
  const termMatch = raw.match(/\[PLAZO:([^\]]+)\]/);
  const cleanNotes = raw
    .replace(/\[CASH_MOV:[^\]]+\]/g, '')
    .replace(/\[USER:[^\]]+\]/g, '')
    .replace(/\[PLAZO:[^\]]+\]/g, '')
    .replace(/\[FUERA_DE_CAJA\]/g, '')
    .replace(/\[CREDITO_PROVEEDOR\]/g, '')
    .replace(/Descontado de Caja(?:\s*\([^)]+\))?/gi, '')
    .replace(/Pagado fuera de caja(?:\s*\([^)]+\))?/gi, '')
    .replace(/Compra a crédito(?:\s*\([^)]+\))?(?:\s*\([^)]+\))?/gi, '')
    .replace(/^[\s—-]+|[\s—-]+$/g, '')
    .trim();

  return {
    recordedBy: userMatch?.[1]?.trim() || null,
    paidFromCashShift: Boolean(cashMatch?.[1]),
    creditLabel: termMatch?.[1]?.trim() || null,
    cleanNotes: cleanNotes || null,
  };
}

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
      createSuccessResponse(
        items.map((p) => ({
          ...p,
          ...parsePurchaseAudit(p.notes),
        })),
        {
          page,
          limit,
          total,
          timestamp: new Date().toISOString(),
        }
      )
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
      deductFromCashShift = false,
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

    // Identificar usuario real de la sesión (o fallback si no hay sesión)
    const sessionUser = await getSessionUser();
    const fallbackHeaderUserId = req.headers.get('x-user-id');
    const resolvedActor = (sessionUser?.id || fallbackHeaderUserId)
      ? await prisma.user.findUnique({
          where: { id: (sessionUser?.id || fallbackHeaderUserId)! },
          select: { id: true, name: true },
        })
      : await prisma.user.findFirst({ select: { id: true, name: true } });

    const userId = resolvedActor?.id || sessionUser?.id || 'system-admin';
    const actorName = resolvedActor?.name || sessionUser?.name || 'Operador';
    const actorTag = `[USER:${actorName}]`;

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
    const result = await prisma.$transaction(
      async (tx) => {
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

        // 1. Normalizar condición al enum PaymentCondition ('CONTADO' | 'CREDITO' | 'A_CUENTA')
        // y si paga al CONTADO desde Caja del Día, registrar egreso validando dueño del turno abierto
        const rawCondition = String(paymentCondition || 'CONTADO').trim().toUpperCase();
        const dbPaymentCondition: 'CONTADO' | 'CREDITO' | 'A_CUENTA' =
          rawCondition === 'CONTADO'
            ? 'CONTADO'
            : rawCondition === 'A_CUENTA'
            ? 'A_CUENTA'
            : 'CREDITO';
        const creditDaysMatch = rawCondition.match(/^CREDITO_(\d+)$/);
        const creditLabel = creditDaysMatch
          ? `Crédito ${creditDaysMatch[1]} días`
          : dbPaymentCondition === 'CREDITO'
          ? 'Crédito'
          : null;

        const isCashPurchase = dbPaymentCondition === 'CONTADO';
        let cashNote = isCashPurchase
          ? `${actorTag} [FUERA_DE_CAJA] Pagado fuera de caja (${actorName})`
          : `${actorTag} [CREDITO_PROVEEDOR]${creditLabel ? ` [PLAZO:${creditLabel}]` : ''} Compra a crédito (${actorName})`;

        if (isCashPurchase && deductFromCashShift && grandTotal > 0) {
          const mov = await recordCashOutflowOnOpenShift(tx, {
            type: 'EXPENSE_OPERATION',
            category: 'COMPRA_PROVEEDOR',
            amount: grandTotal,
            description: `Compra ${purchaseNumber} (${supplierName.trim()}) - Fact. ${invoiceNumber.trim()} [Por: ${actorName}]`,
            beneficiary: supplierName.trim(),
            receiptNo: invoiceNumber.trim(),
            expectedUserId: userId,
            enforceShiftOwner: true,
          });
          if (mov) {
            cashNote = `[CASH_MOV:${mov.id}] ${actorTag} Descontado de Caja (${actorName})`;
          }
        }

        const finalNotes = [notes ? notes.trim() : null, cashNote].filter(Boolean).join(' — ') || null;

        // 2. Crear comprobante de compra
        const purchase = await tx.purchase.create({
          data: {
            purchaseNumber,
            invoiceNumber: invoiceNumber.trim(),
            supplierId: supplierRecord.id,
            supplierRuc: supplierRuc.trim(),
            supplierName: supplierName.trim(),
            paymentCondition: dbPaymentCondition,
            subtotal: grandTotal - vatAmount,
            vatAmount,
            grandTotal,
            notes: finalNotes,
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

        // 2. Incrementar stock en almacén, actualizar costo y registrar Kardex en lote
        const productIds = validatedItems.map((i) => i.productId);
        const [stockItems, currentProducts] = await Promise.all([
          tx.stockItem.findMany({
            where: {
              warehouseId,
              productId: { in: productIds },
            },
          }),
          tx.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, costPrice: true, name: true },
          }),
        ]);

        const stockMap = new Map(stockItems.map((si) => [si.productId, si]));
        const productMap = new Map(currentProducts.map((p) => [p.id, p]));

        for (const item of validatedItems) {
          const stockItem = stockMap.get(item.productId);
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
          const currentProduct = productMap.get(item.productId);
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
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );

    return NextResponse.json(createSuccessResponse(result), { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        createErrorResponse(error.message, error.code || 'PURCHASE_PROCESS_ERROR'),
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      createErrorResponse(error.message, 'PURCHASE_PROCESS_ERROR'),
      { status: 500 }
    );
  }
}


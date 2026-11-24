import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BillingService } from '@/modules/billing/services/billing.service';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { getSessionUser } from '@/lib/auth/session';
import { createCustomerAccountPayment } from '@/modules/billing/utils/customer-account-payment';

export const dynamic = 'force-dynamic';

const billingService = new BillingService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerRuc,
      customerName,
      customerAddress,
      amount,
      paymentMethod = 'EFECTIVO',
      paymentReference,
      customDescription,
      settleAccountBalance = true,
    } = body;

    if (!customerRuc || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        createErrorResponse('RUC de cliente y monto válido son requeridos', 'INVALID_INPUT'),
        { status: 400 }
      );
    }

    // Descripción oficial por defecto solicitada:
    // "MATERIALES DE CONSTRUCCIÓN VARIOS SEGÚN ÓRDENES DE ENTREGA DEL MES DE NOVIEMBRE 2026"
    const now = new Date();
    const MESES = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    const currentMonthName = MESES[now.getMonth()];
    const currentYear = now.getFullYear();

    const invoiceItemDescription =
      customDescription?.trim() ||
      `MATERIALES DE CONSTRUCCIÓN VARIOS SEGÚN ÓRDENES DE ENTREGA DEL MES DE ${currentMonthName} ${currentYear}`;

    // Obtener o asegurar usuario administrador de auditoría
    const sessionUser = await getSessionUser();
    let userId = sessionUser?.id;
    if (!userId) {
      let user = await prisma.user.findFirst({ select: { id: true } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'admin@deposito4demarzo.com.py',
            name: 'Administrador 4 de Marzo',
            passwordHash: 'dummy',
            role: 'SUPER_ADMIN',
          },
        });
      }
      userId = user.id;
    }

    // Obtener turno de caja abierto si hubiere
    const openShift = await prisma.cashShift.findFirst({
      where: { isOpen: true },
      orderBy: { openedAt: 'desc' },
      select: { id: true },
    });

    // Obtener o crear el artículo genérico de consolidación de materiales varios
    let genericProduct = await prisma.product.findFirst({
      where: { sku: 'GEN-VAR' },
    });

    if (!genericProduct) {
      genericProduct = await prisma.product.create({
        data: {
          sku: 'GEN-VAR',
          name: invoiceItemDescription,
          description: invoiceItemDescription,
          unitOfMeasure: 'UNIDAD',
          vatRate: 'IVA_10',
          costPrice: 0,
          salePrice: Number(amount),
          minStockAlert: 0,
        },
      });
    } else {
      // Actualizar nombre a la descripción del mes que se está facturando
      await prisma.product.update({
        where: { id: genericProduct.id },
        data: {
          name: invoiceItemDescription,
          description: invoiceItemDescription,
          salePrice: Number(amount),
        },
      });
    }

    // Procesar la venta fiscal y emitir comprobante electrónico SIFEN
    // Nota: cashShiftId va null en Sale para evitar doble conteo en caja (si se salda ahora, ingresa por CustomerPayment; si ya estaba saldado, ya ingresó antes).
    const sale = await billingService.processSale({
      userId,
      cashShiftId: null,
      customerName: customerName.trim(),
      customerRuc: customerRuc.trim(),
      customerAddress: customerAddress?.trim() || 'Mostrador / Obra',
      paymentCondition: 'CONTADO',
      paymentMethod: paymentMethod || 'EFECTIVO',
      paymentReference: paymentReference?.trim() || null,
      deliveryStatus: 'DELIVERED',
      deliveryNotes: settleAccountBalance
        ? 'Facturación consolidada de Cuenta Corriente / Libreta (Saldado en el acto)'
        : 'Facturación consolidada de Cuenta Corriente / Libreta (Ya abonado previamente)',
      items: [
        {
          productId: genericProduct.id,
          quantity: 1,
          unitPrice: Number(amount),
          vatRate: 'IVA_10',
        },
      ],
      issueInvoiceImmediately: true,
    });

    // Si corresponde saldar la libreta en el mismo acto, registrar el pago en cuenta corriente + ingreso a caja
    let settlementPayment = null;
    if (settleAccountBalance && sale) {
      const invRef = sale.invoice?.invoiceNumber || sale.saleNumber;
      settlementPayment = await createCustomerAccountPayment(prisma, {
        customerRuc: customerRuc.trim(),
        customerName: customerName.trim(),
        amount: Number(amount),
        paymentMethod: paymentMethod || 'EFECTIVO',
        paymentReference: paymentReference?.trim() || null,
        cashShiftId: openShift?.id || null,
        notes: `Cancelación con Factura SIFEN ${invRef}`,
        userId,
      });
    }

    return NextResponse.json(createSuccessResponse({ ...sale, settlementPayment }), { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message, 'MONTH_INVOICE_PROCESS_ERROR'),
      { status: 500 }
    );
  }
}

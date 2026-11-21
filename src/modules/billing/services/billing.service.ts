import { BillingRepository } from '../repositories/billing.repository';
import { CreateSaleInput, SaleFilterParams } from '../types/billing.types';
import { calculateVatBreakdown } from '@/shared/utils/vat-calculator';
import { generateSifenCdc } from '@/shared/utils/cdc-generator';
import { prisma } from '@/lib/prisma';
import { NotFoundError, AppError } from '@/shared/errors/app-error';

export class BillingService {
  private repo: BillingRepository;

  constructor() {
    this.repo = new BillingRepository();
  }

  async listSales(params: SaleFilterParams) {
    return this.repo.findSales(params);
  }

  async getSaleDetails(id: string) {
    const sale = await this.repo.findSaleById(id);
    if (!sale) throw new NotFoundError('Venta', id);
    return sale;
  }

  async processSale(input: CreateSaleInput) {
    const itemCalculations = input.items.map((item) => {
      const discount = item.discount || 0;
      const subtotal = item.quantity * item.unitPrice - discount;
      return { ...item, subtotal, discount, total: subtotal };
    });

    const taxSummary = calculateVatBreakdown(
      itemCalculations.map((i) => ({ total: i.subtotal, vatRate: i.vatRate }))
    );

    const isQuotation = !!input.isQuotation;
    const saleNumber = isQuotation
      ? await this.repo.getLatestQuotationNumber()
      : await this.repo.getLatestSaleNumber();
    const warehouse = !isQuotation
      ? await prisma.warehouse.findFirst({ where: { isMain: true } })
      : null;

    return prisma.$transaction(
      async (tx) => {
        const isScheduled = !isQuotation && !!input.isScheduled;
        const downPayment = isQuotation ? 0 : Number(input.downPayment || 0);
        const balanceDue = isQuotation
          ? 0
          : Number(input.balanceDue ?? (taxSummary.grandTotal - downPayment));
        const reservationReceiptNumber = isScheduled
          ? `RES-${saleNumber.replace(/\D/g, '').padStart(6, '0')}`
          : null;

        const sale = await tx.sale.create({
          data: {
            saleNumber,
            userId: input.userId,
            cashShiftId: isQuotation ? null : (input.cashShiftId || null),
            customerName: input.customerName.trim(),
            customerRuc: input.customerRuc.trim(),
            customerEmail: input.customerEmail?.trim() || null,
            customerAddress: input.customerAddress?.trim() || null,
            googleMapsUrl: input.googleMapsUrl?.trim() || null,
            paymentCondition: input.paymentCondition,
            paymentMethod: input.paymentMethod,
            paymentReference: input.paymentReference?.trim() || null,
            creditTermDays: input.creditTermDays || 0,
            projectId: input.projectId || null,
            driverId: input.driverId || null,
            helperIds: input.helperIds || [],
            vehiclePlate: input.vehiclePlate?.trim() || null,
            deliveryStatus: isQuotation
              ? 'QUOTATION'
              : isScheduled
              ? 'PENDING_DELIVERY'
              : (input.deliveryStatus || 'DELIVERED'),
            deliveryNotes: input.deliveryNotes?.trim() || null,
            isScheduled,
            scheduledDeliveryDate: input.scheduledDeliveryDate ? new Date(input.scheduledDeliveryDate) : null,
            deliveryTimeSlot: input.deliveryTimeSlot || null,
            downPayment,
            balanceDue,
            reservationReceiptNumber,
            secondaryDriverId: input.secondaryDriverId || null,
            secondaryHelperIds: input.secondaryHelperIds || [],
            secondaryVehiclePlate: input.secondaryVehiclePlate?.trim() || null,
            subtotal: taxSummary.grandTotal,
            grandTotal: taxSummary.grandTotal,
            totalExempt: taxSummary.exempt,
            totalVat5: taxSummary.taxable5,
            totalVat10: taxSummary.taxable10,
            vat5Amount: taxSummary.vat5Amount,
            vat10Amount: taxSummary.vat10Amount,
            status: isQuotation ? 'QUOTATION' : isScheduled ? 'PENDING' : 'COMPLETED',
            items: {
              create: itemCalculations.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                vatRate: item.vatRate,
                subtotal: item.subtotal,
                vatAmount: item.vatRate === 'IVA_10' ? Math.round(item.subtotal / 11) : item.vatRate === 'IVA_5' ? Math.round(item.subtotal / 21) : 0,
              })),
            },
          },
          include: { items: true },
        });

        // 1.1 Registrar / Actualizar el cliente en el maestro de clientes para autocompletado SIFEN
        if (input.customerRuc && input.customerName && input.customerRuc.trim() !== '44444401-7') {
          await tx.customer.upsert({
            where: { ruc: input.customerRuc.trim() },
            update: {
              name: input.customerName.trim(),
              address: input.customerAddress?.trim() || undefined,
              googleMapsUrl: input.googleMapsUrl?.trim() || undefined,
            },
            create: {
              ruc: input.customerRuc.trim(),
              name: input.customerName.trim(),
              address: input.customerAddress?.trim() || undefined,
              googleMapsUrl: input.googleMapsUrl?.trim() || undefined,
            },
          });
        }

        // 2. Gestión de Stock en lote: Si es presupuesto NO toca stock; si es programado reserva; si es entrega inmediata deduce
        if (!isQuotation && warehouse) {
          const productIds = itemCalculations.map((item) => item.productId);
          const stockItems = await tx.stockItem.findMany({
            where: {
              warehouseId: warehouse.id,
              productId: { in: productIds },
            },
          });
          const stockMap = new Map(stockItems.map((si) => [si.productId, si]));

          for (const item of itemCalculations) {
            const stockItem = stockMap.get(item.productId);

            if (stockItem) {
              if (isScheduled) {
                // Incrementar stock reservado para evitar sobreventas mientras la mercadería sigue en planta
                await tx.stockItem.update({
                  where: { id: stockItem.id },
                  data: { reservedStock: Number(stockItem.reservedStock || 0) + item.quantity },
                });
              } else {
                // Deducción inmediata física
                const prevStock = Number(stockItem.currentStock || 0);
                const newStock = prevStock - item.quantity;

                await tx.stockItem.update({
                  where: { id: stockItem.id },
                  data: { currentStock: newStock },
                });

                await tx.stockMovement.create({
                  data: {
                    movementType: 'OUT_SALE',
                    productId: item.productId,
                    warehouseId: warehouse.id,
                    quantity: item.quantity,
                    unitCost: item.unitPrice * 0.7, // estimación
                    totalCost: item.quantity * item.unitPrice * 0.7,
                    previousStock: prevStock,
                    newStock: newStock,
                    referenceType: 'FACTURA_VENTA',
                    referenceId: sale.id,
                    notes: `Venta mostrador a ${sale.customerName}`,
                    userId: input.userId,
                  },
                });
              }
            }
          }
        }

        // 3. Generar comprobante electrónico SIFEN con CDC de 44 dígitos (nunca en presupuestos)
        if (!isQuotation && input.issueInvoiceImmediately) {
          const invoiceSeq = parseInt(sale.saleNumber.replace(/\D/g, ''), 10) || 1;
          const invoiceNumber = `001-001-${invoiceSeq.toString().padStart(7, '0')}`;
          const cdc = generateSifenCdc({ secuencia: invoiceSeq, issueDate: sale.createdAt });

          await tx.invoice.create({
            data: {
              saleId: sale.id,
              invoiceNumber,
              dteType: 'FACTURA_ELECTRONICA',
              cdc,
              sifenStatus: 'APPROVED', // Simulado aprobado por la DNIT
              qrCodeUrl: `https://sifen.set.gov.py/consultas/qr?nVersion=150&IdGESIFEN=${cdc}`,
            },
          });
        }

        return tx.sale.findUnique({
          where: { id: sale.id },
          include: {
            items: { include: { product: true } },
            invoice: true,
            project: true,
            driver: true,
            secondaryDriver: true,
          },
        });
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );
  }

  async getMetricsSummary() {
    return this.repo.getTodaySalesTotal();
  }
}

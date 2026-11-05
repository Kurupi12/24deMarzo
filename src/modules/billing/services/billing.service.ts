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

    const saleNumber = await this.repo.getLatestSaleNumber();

    return prisma.$transaction(async (tx) => {
      // 1. Obtener almacén principal para deducción de stock
      const warehouse = await tx.warehouse.findFirst({ where: { isMain: true } });

      const sale = await tx.sale.create({
        data: {
          saleNumber,
          userId: input.userId,
          cashShiftId: input.cashShiftId || null,
          customerName: input.customerName.trim(),
          customerRuc: input.customerRuc.trim(),
          customerEmail: input.customerEmail?.trim() || null,
          customerAddress: input.customerAddress?.trim() || null,
          paymentCondition: input.paymentCondition,
          paymentMethod: input.paymentMethod,
          creditTermDays: input.creditTermDays || 0,
          subtotal: taxSummary.grandTotal,
          grandTotal: taxSummary.grandTotal,
          totalExempt: taxSummary.exempt,
          totalVat5: taxSummary.taxable5,
          totalVat10: taxSummary.taxable10,
          vat5Amount: taxSummary.vat5Amount,
          vat10Amount: taxSummary.vat10Amount,
          status: 'COMPLETED',
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

      // 2. Deducir stock y asentar Kardex
      if (warehouse) {
        for (const item of itemCalculations) {
          const stockItem = await tx.stockItem.findUnique({
            where: { productId_warehouseId: { productId: item.productId, warehouseId: warehouse.id } },
          });

          const prevStock = Number(stockItem?.currentStock || 0);
          const newStock = prevStock - item.quantity;

          if (stockItem) {
            await tx.stockItem.update({
              where: { id: stockItem.id },
              data: { currentStock: newStock },
            });
          }

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

      // 3. Generar comprobante electrónico SIFEN con CDC de 44 dígitos
      if (input.issueInvoiceImmediately) {
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
        include: { items: { include: { product: true } }, invoice: true },
      });
    });
  }

  async getMetricsSummary() {
    return this.repo.getTodaySalesTotal();
  }
}

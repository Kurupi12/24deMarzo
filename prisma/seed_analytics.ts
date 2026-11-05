import { PrismaClient, MovementType, PaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 Generando datos históricos analíticos para el Dashboard...');

  const warehouse = await prisma.warehouse.findFirst({ where: { isMain: true } });
  const admin = await prisma.user.findFirst();
  const products = await prisma.product.findMany({ take: 30 });

  if (!warehouse || !admin || products.length === 0) {
    console.error('Faltan depósitos o productos para sembrar analytics');
    return;
  }

  const now = new Date();
  const existingSalesCount = await prisma.sale.count();

  if (existingSalesCount < 15) {
    console.log('Generando ventas históricas para los últimos 60 días...');
    for (let dayOffset = 60; dayOffset >= 0; dayOffset--) {
      const saleDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const ticketsCount = 2 + Math.floor(Math.sin(dayOffset * 0.3) * 2 + 2);

      for (let t = 0; t < ticketsCount; t++) {
        const prod = products[Math.floor(Math.random() * products.length)];
        const qty = 1 + Math.floor(Math.random() * 5);
        const unitPrice = Number(prod.salePrice) || 25000;
        const subtotal = qty * unitPrice;
        const vat10 = Math.round(subtotal / 11);

        const paymentMethod =
          t % 3 === 0
            ? PaymentMethod.TARJETA_DEBITO
            : t % 3 === 1
            ? PaymentMethod.TRANSFERENCIA_BANCARIA
            : PaymentMethod.EFECTIVO;

        const saleNumber = `FAC-001-${String(dayOffset).padStart(3, '0')}-${String(t).padStart(4, '0')}`;

        await prisma.sale.create({
          data: {
            saleNumber,
            customerName: t % 2 === 0 ? 'Cliente Ocasional' : 'Constructora del Este S.A.',
            customerRuc: t % 2 === 0 ? '44444401-7' : '80012345-6',
            paymentMethod: paymentMethod,
            status: 'COMPLETED',
            subtotal: subtotal,
            discountTotal: 0,
            grandTotal: subtotal,
            totalExempt: 0,
            totalVat5: 0,
            totalVat10: subtotal,
            vat5Amount: 0,
            vat10Amount: vat10,
            userId: admin.id,
            createdAt: saleDate,
            items: {
              create: [
                {
                  productId: prod.id,
                  quantity: qty,
                  unitPrice: unitPrice,
                  vatRate: prod.vatRate,
                  vatAmount: vat10,
                  subtotal: subtotal,
                },
              ],
            },
          },
        });
      }
    }
  }

  // 2. Sembrar compras a proveedores en Kardex
  const existingPurchasesCount = await prisma.stockMovement.count({
    where: { movementType: MovementType.IN_PURCHASE },
  });

  if (existingPurchasesCount < 10) {
    console.log('Generando compras a proveedores en Kardex para gastos...');
    for (let monthOffset = 6; monthOffset >= 0; monthOffset--) {
      const purchaseDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 10);
      const prod = products[monthOffset % products.length];
      const qty = 30 + monthOffset * 10;
      const unitCost = Number(prod.costPrice) || 15000;
      const totalCost = qty * unitCost;

      await prisma.stockMovement.create({
        data: {
          movementType: MovementType.IN_PURCHASE,
          productId: prod.id,
          warehouseId: warehouse.id,
          quantity: qty,
          unitCost: unitCost,
          totalCost: totalCost,
          previousStock: 50,
          newStock: 50 + qty,
          referenceType: 'FACTURA_COMPRA_PROVEEDOR',
          referenceId: `FC-PRV-2026-${100 + monthOffset}`,
          notes: `Reposición de stock para ferretería - Lote ${monthOffset + 1}`,
          userId: admin.id,
          createdAt: purchaseDate,
        },
      });
    }
  }

  console.log('✅ Datos analíticos sembrados exitosamente.');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

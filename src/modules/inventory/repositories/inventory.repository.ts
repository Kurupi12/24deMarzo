import { prisma } from '@/lib/prisma';
import { CreateProductDto, UpdateProductDto } from '../validators/product.schema';
import { ProductFilterParams } from '../types/inventory.types';

export class InventoryRepository {
  async findProducts(params: ProductFilterParams) {
    const { search, vatRate, isActive = true, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = { isActive };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (vatRate) {
      where.vatRate = vatRate;
    }

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          stockItems: {
            include: { warehouse: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return { total, items, page, limit };
  }

  async findProductById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        stockItems: { include: { warehouse: true } },
      },
    });
  }

  async createProduct(dto: CreateProductDto) {
    return prisma.product.create({
      data: {
        sku: dto.sku.trim(),
        barcode: dto.barcode?.trim() || null,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        unitOfMeasure: dto.unitOfMeasure,
        vatRate: dto.vatRate,
        costPrice: dto.costPrice,
        salePrice: dto.salePrice,
        minStockAlert: dto.minStockAlert,
        maxStockLimit: dto.maxStockLimit ?? null,
      },
    });
  }

  async updateProduct(dto: UpdateProductDto) {
    return prisma.product.update({
      where: { id: dto.id },
      data: {
        sku: dto.sku.trim(),
        barcode: dto.barcode?.trim() || null,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        unitOfMeasure: dto.unitOfMeasure,
        vatRate: dto.vatRate,
        costPrice: dto.costPrice,
        salePrice: dto.salePrice,
        minStockAlert: dto.minStockAlert,
        maxStockLimit: dto.maxStockLimit ?? null,
      },
    });
  }

  async deleteProduct(id: string) {
    const saleItemsCount = await prisma.saleItem.count({
      where: { productId: id },
    });

    if (saleItemsCount > 0) {
      const product = await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      return {
        action: 'archived',
        product,
        message: 'Producto archivado/dado de baja para resguardar la validez de comprobantes y ventas históricas.',
      };
    }

    return prisma.$transaction(async (tx) => {
      await tx.stockMovement.deleteMany({ where: { productId: id } });
      await tx.stockItem.deleteMany({ where: { productId: id } });
      const deleted = await tx.product.delete({ where: { id } });
      return {
        action: 'deleted',
        product: deleted,
        message: 'Producto eliminado correctamente de la base de datos.',
      };
    });
  }

  async getCriticalStockAlerts() {
    return prisma.$queryRaw<Array<{ id: string; name: string; sku: string; current_stock: number; min_stock: number }>>`
      SELECT p.id, p.name, p.sku, COALESCE(SUM(si."currentStock"), 0) as current_stock, p."minStockAlert" as min_stock
      FROM products p
      LEFT JOIN stock_items si ON p.id = si."productId"
      WHERE p."isActive" = true
      GROUP BY p.id, p.name, p.sku, p."minStockAlert"
      HAVING COALESCE(SUM(si."currentStock"), 0) <= p."minStockAlert"
      ORDER BY current_stock ASC
      LIMIT 10;
    `;
  }
}

import { InventoryRepository } from '../repositories/inventory.repository';
import { CreateProductDto, UpdateProductDto } from '../validators/product.schema';
import { ProductFilterParams, StockMovementInput } from '../types/inventory.types';
import { prisma } from '@/lib/prisma';
import { AppError, NotFoundError } from '@/shared/errors/app-error';

export class InventoryService {
  private repo: InventoryRepository;

  constructor() {
    this.repo = new InventoryRepository();
  }

  async listProducts(params: ProductFilterParams) {
    return this.repo.findProducts(params);
  }

  async getProductDetails(id: string) {
    const product = await this.repo.findProductById(id);
    if (!product) {
      throw new NotFoundError('Producto', id);
    }
    return product;
  }

  async createNewProduct(dto: CreateProductDto) {
    return this.repo.createProduct(dto);
  }

  async updateProduct(dto: UpdateProductDto) {
    // Verificar unicidad de SKU
    const existingSku = await prisma.product.findFirst({
      where: {
        sku: dto.sku.trim(),
        NOT: { id: dto.id },
      },
    });

    if (existingSku) {
      throw new AppError(
        `El SKU "${dto.sku}" ya está registrado en el producto: ${existingSku.name}`,
        409,
        'SKU_ALREADY_EXISTS'
      );
    }

    // Verificar unicidad de barcode si existe
    if (dto.barcode?.trim()) {
      const existingBarcode = await prisma.product.findFirst({
        where: {
          barcode: dto.barcode.trim(),
          NOT: { id: dto.id },
        },
      });

      if (existingBarcode) {
        throw new AppError(
          `El código de barras "${dto.barcode}" ya está registrado en: ${existingBarcode.name}`,
          409,
          'BARCODE_ALREADY_EXISTS'
        );
      }
    }

    return this.repo.updateProduct(dto);
  }

  async deleteProduct(id: string) {
    const product = await this.repo.findProductById(id);
    if (!product) {
      throw new NotFoundError('Producto', id);
    }
    return this.repo.deleteProduct(id);
  }

  async registerKardexMovement(input: StockMovementInput) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: input.productId },
      });
      if (!product) throw new NotFoundError('Producto', input.productId);

      // Obtener o inicializar registro en el depósito
      let stockItem = await tx.stockItem.findUnique({
        where: {
          productId_warehouseId: {
            productId: input.productId,
            warehouseId: input.warehouseId,
          },
        },
      });

      if (!stockItem) {
        stockItem = await tx.stockItem.create({
          data: {
            productId: input.productId,
            warehouseId: input.warehouseId,
            currentStock: 0,
            reservedStock: 0,
          },
        });
      }

      const prevStock = Number(stockItem.currentStock);
      const isIncrement = [
        'IN_PURCHASE',
        'TRANSFER_IN',
        'ADJUSTMENT_POSITIVE',
        'INITIAL_STOCK',
      ].includes(input.movementType);

      const newStock = isIncrement
        ? prevStock + input.quantity
        : prevStock - input.quantity;

      if (newStock < 0) {
        throw new AppError(
          `Stock insuficiente para el producto ${product.name}. Stock actual: ${prevStock}, requerido: ${input.quantity}`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }

      // Actualizar balance
      await tx.stockItem.update({
        where: { id: stockItem.id },
        data: { currentStock: newStock },
      });

      // Crear registro inmutable de Kardex
      return tx.stockMovement.create({
        data: {
          movementType: input.movementType,
          productId: input.productId,
          warehouseId: input.warehouseId,
          originWarehouseId: input.originWarehouseId || null,
          quantity: input.quantity,
          unitCost: input.unitCost,
          totalCost: input.quantity * input.unitCost,
          previousStock: prevStock,
          newStock: newStock,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          notes: input.notes,
          userId: input.userId,
        },
      });
    });
  }

  async getCriticalStockAlerts() {
    return this.repo.getCriticalStockAlerts();
  }
}

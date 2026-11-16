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

  async generateNextSku(productName?: string): Promise<{ sku: string; prefix: string; nextNumber: number }> {
    const rawName = (productName || '').trim();
    const clean = rawName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const match = clean.match(/[A-ZÑ]/);
    const firstLetter = match ? match[0] : 'C';

    const letterPrefixMap: Record<string, string> = {
      A: 'A1', B: 'B1', C: 'C3', D: 'D4', E: 'E5', F: 'F6', G: 'G7', H: 'H8',
      I: 'I9', J: 'J10', K: 'K11', L: 'L12', M: 'M13', N: 'N14', Ñ: 'N14',
      O: 'O15', P: 'P17', Q: 'Q18', R: 'R19', S: 'S20', T: 'T21', U: 'U22',
      V: 'V23', W: 'W24', X: 'X25', Y: 'Y26', Z: 'Z27'
    };

    const prefix = letterPrefixMap[firstLetter] || `${firstLetter}1`;

    const existing = await prisma.product.findMany({
      where: { sku: { startsWith: prefix } },
      select: { sku: true },
    });

    const numbers = existing
      .map((p) => {
        const suffix = p.sku.slice(prefix.length);
        return parseInt(suffix, 10);
      })
      .filter((n) => !isNaN(n));

    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    let nextNum = maxNum + 1;

    let formattedNum = nextNum < 10 ? `0${nextNum}` : String(nextNum);
    let candidateSku = `${prefix}${formattedNum}`;

    const existingSkusSet = new Set(existing.map((e) => e.sku.toUpperCase()));
    while (existingSkusSet.has(candidateSku.toUpperCase())) {
      nextNum++;
      formattedNum = nextNum < 10 ? `0${nextNum}` : String(nextNum);
      candidateSku = `${prefix}${formattedNum}`;
    }

    return { sku: candidateSku, prefix, nextNumber: nextNum };
  }

  async createNewProduct(dto: CreateProductDto) {
    const cleanSku = dto.sku.trim();
    const existingSku = await prisma.product.findUnique({
      where: { sku: cleanSku },
      select: { id: true, name: true, sku: true },
    });

    if (existingSku) {
      throw new AppError(
        `El código SKU "${cleanSku}" ya existe en el sistema y pertenece al producto: "${existingSku.name}". Por favor, utilice un código diferente.`,
        409,
        'SKU_ALREADY_EXISTS'
      );
    }

    if (dto.barcode?.trim()) {
      const cleanBarcode = dto.barcode.trim();
      const existingBarcode = await prisma.product.findUnique({
        where: { barcode: cleanBarcode },
        select: { id: true, name: true, barcode: true },
      });

      if (existingBarcode) {
        throw new AppError(
          `El código de barras "${cleanBarcode}" ya está registrado en el producto: "${existingBarcode.name}".`,
          409,
          'BARCODE_ALREADY_EXISTS'
        );
      }
    }

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

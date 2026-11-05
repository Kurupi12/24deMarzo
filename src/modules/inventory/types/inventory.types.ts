import { SifenUnitOfMeasure, VatRate, MovementType } from '@prisma/client';

export interface ProductFilterParams {
  search?: string;
  vatRate?: VatRate;
  onlyLowStock?: boolean;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface StockMovementInput {
  productId: string;
  warehouseId: string;
  originWarehouseId?: string;
  movementType: MovementType;
  quantity: number;
  unitCost: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  userId: string;
}


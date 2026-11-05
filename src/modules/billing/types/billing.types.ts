import { PaymentCondition, PaymentMethod, SifenDocType, VatRate } from '@prisma/client';

export interface CreateSaleItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  vatRate: VatRate;
}

export interface CreateSaleInput {
  userId: string;
  cashShiftId?: string | null;
  customerName: string;
  customerRuc: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  paymentCondition: PaymentCondition;
  paymentMethod: PaymentMethod;
  creditTermDays?: number;
  projectId?: string | null;
  driverId?: string | null;
  helperIds?: string[];
  vehiclePlate?: string | null;
  deliveryStatus?: string;
  deliveryNotes?: string | null;
  items: CreateSaleItemInput[];
  issueInvoiceImmediately?: boolean;
}

export interface SaleFilterParams {
  search?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}


import { z } from 'zod';

export const SaleItemSchema = z.object({
  productId: z.string().uuid('ID de producto inválido'),
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  unitPrice: z.number().min(0, 'El precio no puede ser negativo'),
  discount: z.number().min(0).default(0),
  vatRate: z.enum(['IVA_10', 'IVA_5', 'EXEMPT']),
});

export const CreateSaleSchema = z.object({
  customerName: z.string().min(2, 'El nombre del cliente es obligatorio'),
  customerRuc: z.string().min(5, 'El RUC o documento del cliente es obligatorio'),
  customerEmail: z.string().email('Email inválido').optional().nullable(),
  customerAddress: z.string().optional().nullable(),
  paymentCondition: z.enum(['CONTADO', 'CREDITO']).default('CONTADO'),
  paymentMethod: z.enum([
    'EFECTIVO',
    'TARJETA_DEBITO',
    'TARJETA_CREDITO',
    'TRANSFERENCIA_BANCARIA',
    'CHEQUE',
    'BILLETERA_ELECTRONICA',
  ]),
  creditTermDays: z.number().int().min(0).optional().default(0),
  cashShiftId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  driverId: z.string().uuid().optional().nullable(),
  helperIds: z.array(z.string()).optional().default([]),
  vehiclePlate: z.string().optional().nullable(),
  deliveryStatus: z.string().optional().default('DELIVERED'),
  deliveryNotes: z.string().optional().nullable(),
  items: z.array(SaleItemSchema).min(1, 'Debe incluir al menos un producto'),
  issueInvoiceImmediately: z.boolean().default(true),
});

export type CreateSaleDto = z.infer<typeof CreateSaleSchema>;


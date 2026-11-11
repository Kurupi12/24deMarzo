import { z } from 'zod';

export const SaleItemSchema = z.object({
  productId: z.string().uuid('ID de producto inválido'),
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  unitPrice: z.number().min(0, 'El precio no puede ser negativo'),
  discount: z.number().min(0).default(0),
  vatRate: z.enum(['IVA_10', 'IVA_5', 'EXEMPT']),
});

export const CreateSaleSchema = z.object({
  customerName: z
    .string()
    .optional()
    .default('Sin Nombre (Consumidor Final)')
    .transform((val) => (val && val.trim().length >= 2 ? val.trim() : 'Sin Nombre (Consumidor Final)')),
  customerRuc: z
    .string()
    .optional()
    .default('44444401-7')
    .transform((val) => (val && val.trim().length >= 3 ? val.trim() : '44444401-7')),
  customerEmail: z.string().email('Email inválido').optional().nullable(),
  customerAddress: z.string().optional().nullable(),
  paymentCondition: z.enum(['CONTADO', 'CREDITO', 'A_CUENTA']).default('CONTADO'),
  paymentMethod: z.enum([
    'EFECTIVO',
    'TARJETA_DEBITO',
    'TARJETA_CREDITO',
    'TRANSFERENCIA_BANCARIA',
    'CHEQUE',
    'BILLETERA_ELECTRONICA',
  ]),
  creditTermDays: z.number().int().min(0).optional().default(0),
  paymentReference: z.string().optional().nullable(),
  cashShiftId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  driverId: z.string().uuid().optional().nullable(),
  helperIds: z.array(z.string()).optional().default([]),
  vehiclePlate: z.string().optional().nullable(),
  deliveryStatus: z.string().optional().default('DELIVERED'),
  deliveryNotes: z.string().optional().nullable(),
  // Programación de Entrega a Futuro y Señas
  isScheduled: z.boolean().optional().default(false),
  scheduledDeliveryDate: z.string().optional().nullable(),
  deliveryTimeSlot: z.string().optional().nullable(),
  downPayment: z.number().min(0).optional().default(0),
  balanceDue: z.number().min(0).optional().default(0),
  secondaryDriverId: z.string().uuid().optional().nullable(),
  secondaryHelperIds: z.array(z.string()).optional().default([]),
  secondaryVehiclePlate: z.string().optional().nullable(),
  items: z.array(SaleItemSchema).min(1, 'Debe incluir al menos un producto'),
  issueInvoiceImmediately: z.boolean().default(true),
});

export type CreateSaleDto = z.infer<typeof CreateSaleSchema>;


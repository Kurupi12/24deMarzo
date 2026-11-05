import { z } from 'zod';

export const SifenUnitOfMeasureEnum = z.enum([
  'UNIDAD',
  'KILOGRAMO',
  'GRAMO',
  'METRO',
  'LITRO',
  'CAJA',
  'PAQUETE',
]);

export const VatRateEnum = z.enum(['IVA_10', 'IVA_5', 'EXEMPT']);

export const CreateProductSchema = z.object({
  sku: z.string().min(2, 'El SKU debe tener al menos 2 caracteres.').max(50),
  barcode: z.string().max(30).optional().nullable(),
  name: z.string().min(2, 'El nombre es obligatorio.').max(200),
  description: z.string().max(1000).optional().nullable(),
  unitOfMeasure: SifenUnitOfMeasureEnum,
  vatRate: VatRateEnum,
  costPrice: z.number().min(0, 'El costo no puede ser negativo.'),
  salePrice: z.number().min(0, 'El precio no puede ser negativo.'),
  minStockAlert: z.number().min(0).default(0),
  maxStockLimit: z.number().min(0).optional().nullable(),
});

export type CreateProductDto = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = z.object({
  id: z.string().uuid(),
  sku: z.string().min(1, 'El SKU no puede estar vacío.').max(50),
  barcode: z.string().max(30).optional().nullable(),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.').max(200),
  description: z.string().max(1000).optional().nullable(),
  unitOfMeasure: SifenUnitOfMeasureEnum,
  vatRate: VatRateEnum,
  costPrice: z.number().min(0, 'El costo no puede ser negativo.'),
  salePrice: z.number().min(0, 'El precio de venta no puede ser negativo.'),
  minStockAlert: z.number().min(0, 'El stock mínimo no puede ser negativo.').default(0),
  maxStockLimit: z.number().min(0).optional().nullable(),
});

export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;

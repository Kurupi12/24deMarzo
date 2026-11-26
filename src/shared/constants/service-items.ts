/**
 * SKUs de servicios de alquiler de contenedores que se facturan en el sistema
 * pero no corresponden a compra/venta física de materiales de construcción.
 */
export const CONTAINER_SERVICE_SKUS = ['S2001', 'S2002', 'S2003'] as const;

export function isContainerServiceSku(sku: string | null | undefined): boolean {
  if (!sku) return false;
  return (CONTAINER_SERVICE_SKUS as readonly string[]).includes(sku.trim().toUpperCase());
}

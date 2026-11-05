export interface VatBreakdown {
  taxable10: number;
  taxable5: number;
  exempt: number;
  vat10Amount: number; // Base IVA 10% / 11
  vat5Amount: number;  // Base IVA 5% / 21
  totalVat: number;
  grandTotal: number;
}

export type VatRateInput = 'IVA_10' | 'IVA_5' | 'EXEMPT';

export function calculateVatBreakdown(
  items: Array<{ total: number; vatRate: VatRateInput }>
): VatBreakdown {
  let taxable10 = 0;
  let taxable5 = 0;
  let exempt = 0;

  for (const item of items) {
    if (item.vatRate === 'IVA_10') {
      taxable10 += item.total;
    } else if (item.vatRate === 'IVA_5') {
      taxable5 += item.total;
    } else {
      exempt += item.total;
    }
  }

  // Fórmulas oficiales DNIT / SIFEN: IVA incluido
  const vat10Amount = Math.round(taxable10 / 11);
  const vat5Amount = Math.round(taxable5 / 21);
  const totalVat = vat10Amount + vat5Amount;
  const grandTotal = taxable10 + taxable5 + exempt;

  return {
    taxable10,
    taxable5,
    exempt,
    vat10Amount,
    vat5Amount,
    totalVat,
    grandTotal,
  };
}


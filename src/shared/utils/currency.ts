export function formatCurrencyPYG(amount: number): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDecimalNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('es-PY', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}


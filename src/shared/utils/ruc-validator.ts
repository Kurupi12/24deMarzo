/**
 * Validación oficial de RUC paraguayo mediante Módulo 11
 */
export function validateParaguayRuc(rucInput: string): { isValid: boolean; expectedDv?: number } {
  const clean = rucInput.trim();
  const parts = clean.split('-');

  if (parts.length !== 2) {
    return { isValid: false };
  }

  const [base, dvStr] = parts;
  const dv = parseInt(dvStr, 10);
  if (isNaN(dv) || base.length < 5) {
    return { isValid: false };
  }

  // Algoritmo de Módulo 11 oficial DNIT
  let baseMax = 11;
  let k = 2;
  let total = 0;

  for (let i = base.length - 1; i >= 0; i--) {
    const charCode = base.charCodeAt(i);
    // Letras convertidas a su código ASCII si aplica
    const digit = (charCode >= 48 && charCode <= 57) ? parseInt(base[i], 10) : charCode;
    total += digit * k;
    k++;
    if (k > baseMax) k = 2;
  }

  const remainder = total % 11;
  const calculatedDv = remainder > 1 ? 11 - remainder : 0;

  return {
    isValid: calculatedDv === dv,
    expectedDv: calculatedDv,
  };
}


/**
 * Convierte montos enteros en Guaraníes a texto en español en mayúsculas
 * Ejemplo: 600000 -> "SEISCIENTOS MIL"
 */
export function numberToWordsPYG(amount: number): string {
  const value = Math.floor(Math.abs(amount));
  if (value === 0) return 'CERO';

  const UNIDADES = [
    '', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
    'VEINTE', 'VEINTIUN', 'VEINTIDOS', 'VEINTITRES', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISEIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE',
  ];

  const DECENAS = [
    '', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA',
  ];

  const CENTENAS = [
    '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS',
  ];

  function convertGroup(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'CIEN';

    let output = '';
    const c = Math.floor(n / 100);
    const r = n % 100;

    if (c > 0) output += CENTENAS[c] + ' ';

    if (r <= 29) {
      output += UNIDADES[r];
    } else {
      const d = Math.floor(r / 10);
      const u = r % 10;
      output += DECENAS[d];
      if (u > 0) output += ' Y ' + UNIDADES[u];
    }

    return output.trim();
  }

  const billones = Math.floor(value / 1000000000000);
  let resto = value % 1000000000000;

  const millones = Math.floor(resto / 1000000);
  resto = resto % 1000000;

  const miles = Math.floor(resto / 1000);
  const unidades = resto % 1000;

  let result = '';

  if (millones > 0) {
    if (millones === 1) {
      result += 'UN MILLON ';
    } else {
      result += convertGroup(millones) + ' MILLONES ';
    }
  }

  if (miles > 0) {
    if (miles === 1) {
      result += 'UN MIL ';
    } else {
      result += convertGroup(miles) + ' MIL ';
    }
  }

  if (unidades > 0) {
    result += convertGroup(unidades);
  }

  return result.trim();
}

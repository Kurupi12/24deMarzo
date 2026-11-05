import { format } from 'date-fns';

export interface GenerateCdcParams {
  docType?: '01' | '04' | '05'; // 01 = Factura Electrónica
  rucEmisor?: string;           // RUC de Depósito 4 de Marzo (ej: 80099999)
  dvEmisor?: string;            // DV del RUC (ej: 1)
  establecimiento?: string;     // 001
  puntoExpedicion?: string;     // 001
  secuencia: number;            // Número consecutivo de factura
  issueDate?: Date;
}

export function generateSifenCdc(params: GenerateCdcParams): string {
  const docType = params.docType || '01';
  const ruc = (params.rucEmisor || '80044444').padStart(8, '0');
  const dv = params.dvEmisor || '1';
  const estab = (params.establecimiento || '001').padStart(3, '0');
  const punto = (params.puntoExpedicion || '001').padStart(3, '0');
  const numDoc = params.secuencia.toString().padStart(7, '0');
  const contribuyente = '2'; // Persona Jurídica
  const fechaStr = format(params.issueDate || new Date(), 'yyyyMMdd');
  const tipoEmision = '1'; // Normal
  
  // Código de seguridad aleatorio de 9 dígitos
  const randomSec = Math.floor(100000000 + Math.random() * 900000000).toString();

  const base43 = `${docType}${ruc}${dv}${estab}${punto}${numDoc}${contribuyente}${fechaStr}${tipoEmision}${randomSec}`;

  // Cálculo de DV del CDC (Módulo 11)
  let k = 2;
  let total = 0;
  for (let i = base43.length - 1; i >= 0; i--) {
    total += parseInt(base43[i], 10) * k;
    k++;
    if (k > 11) k = 2;
  }

  const remainder = total % 11;
  const dvCdc = remainder > 1 ? 11 - remainder : 0;

  return `${base43}${dvCdc}`;
}


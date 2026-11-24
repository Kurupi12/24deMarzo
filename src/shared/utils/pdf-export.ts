/**
 * Utilidad cliente para generar y descargar archivos PDF nítidos desde cualquier
 * plantilla HTML del sistema (A4, Ticket térmico 80mm, Extractos y Reportes),
 * con soporte para impresión directa y flujo rápido de envío por WhatsApp.
 */

export interface PdfExportOptions {
  fileName: string;
  paperSize?: 'A4' | 'ticket';
  lightMode?: boolean;
  scale?: number;
}

const LIGHT_MODE_CSS = `
  .pdf-light-surface,
  .pdf-light-surface * {
    color-scheme: light !important;
  }
  .pdf-light-surface {
    background: #ffffff !important;
    color: #0f172a !important;
    border-color: #94a3b8 !important;
    box-shadow: none !important;
  }
  .pdf-light-surface [class*="bg-\\[#0"],
  .pdf-light-surface [class*="bg-card"],
  .pdf-light-surface [class*="bg-muted"],
  .pdf-light-surface thead,
  .pdf-light-surface tr {
    background-color: #ffffff !important;
  }
  .pdf-light-surface thead tr {
    background-color: #f1f5f9 !important;
  }
  .pdf-light-surface [class*="border-card-border"] {
    border-color: #cbd5e1 !important;
  }
  .pdf-light-surface,
  .pdf-light-surface .text-foreground,
  .pdf-light-surface p,
  .pdf-light-surface span,
  .pdf-light-surface div,
  .pdf-light-surface td,
  .pdf-light-surface th {
    color: #0f172a !important;
  }
  .pdf-light-surface .text-muted-foreground {
    color: #475569 !important;
  }
  .pdf-light-surface .text-primary {
    color: #0369a1 !important;
  }
  .pdf-light-surface .text-emerald-400,
  .pdf-light-surface .text-emerald-300 {
    color: #047857 !important;
  }
  .pdf-light-surface .text-amber-400,
  .pdf-light-surface .text-amber-300 {
    color: #b45309 !important;
  }
  .pdf-light-surface .text-blue-400 {
    color: #1d4ed8 !important;
  }
  .pdf-light-surface .text-cyan-400,
  .pdf-light-surface .text-sky-400 {
    color: #0e7490 !important;
  }
  .pdf-light-surface .text-danger,
  .pdf-light-surface .text-red-400 {
    color: #b91c1c !important;
  }
`;

function sanitizePdfFilename(rawName: string): string {
  const cleaned = rawName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const base = cleaned || 'Documento_Deposito_4_de_Marzo';
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

export async function downloadElementAsPdf(
  elementId: string,
  options: PdfExportOptions
): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('La exportación a PDF solo está disponible en el navegador.');
  }

  const sourceElement = document.getElementById(elementId);
  if (!sourceElement) {
    throw new Error(`No se encontró el documento "${elementId}" para exportar.`);
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const { paperSize = 'A4', lightMode = false, scale = 2 } = options;
  const safeFileName = sanitizePdfFilename(options.fileName);

  const canvas = await html2canvas(sourceElement, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    onclone: (clonedDoc, clonedEl) => {
      clonedDoc.documentElement.style.fontSize = '16px';

      const styleEl = clonedDoc.createElement('style');
      styleEl.textContent = `
        .no-print { display: none !important; }
        ${lightMode ? LIGHT_MODE_CSS : ''}
      `;
      clonedDoc.head.appendChild(styleEl);

      if (lightMode) {
        clonedEl.classList.add('pdf-light-surface');
      }

      clonedEl.style.boxShadow = 'none';
      clonedEl.style.margin = '0';
      clonedEl.style.borderRadius = '0';
      if (paperSize === 'ticket') {
        clonedEl.style.width = '80mm';
        clonedEl.style.maxWidth = '80mm';
        clonedEl.style.padding = '5mm';
      }
    },
  });

  const imgData = canvas.toDataURL('image/png', 1.0);

  if (paperSize === 'ticket') {
    const ticketWidthMm = 80;
    const ticketHeightMm = Math.max(80, (canvas.height * ticketWidthMm) / canvas.width);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [ticketWidthMm, ticketHeightMm],
      compress: true,
    });
    pdf.addImage(imgData, 'PNG', 0, 0, ticketWidthMm, ticketHeightMm, undefined, 'FAST');
    pdf.save(safeFileName);
    return safeFileName;
  }

  const pageWidthMm = 210;
  const pageHeightMm = 297;
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const renderedHeightMm = (canvas.height * pageWidthMm) / canvas.width;

  // Si excede levemente 1 hoja por redondeo de píxeles (< 4mm), ajustar a 1 sola hoja A4
  if (renderedHeightMm <= pageHeightMm + 4) {
    const fitHeight = Math.min(renderedHeightMm, pageHeightMm);
    const fitWidth = renderedHeightMm > pageHeightMm ? (pageWidthMm * pageHeightMm) / renderedHeightMm : pageWidthMm;
    const xOffset = (pageWidthMm - fitWidth) / 2;
    pdf.addImage(imgData, 'PNG', xOffset, 0, fitWidth, fitHeight, undefined, 'FAST');
  } else {
    let remainingHeight = renderedHeightMm;
    let yOffset = 0;
    pdf.addImage(imgData, 'PNG', 0, yOffset, pageWidthMm, renderedHeightMm, undefined, 'FAST');
    remainingHeight -= pageHeightMm;

    while (remainingHeight > 2) {
      yOffset -= pageHeightMm;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, yOffset, pageWidthMm, renderedHeightMm, undefined, 'FAST');
      remainingHeight -= pageHeightMm;
    }
  }

  pdf.save(safeFileName);
  return safeFileName;
}

export function openWhatsAppShareWindow(message: string, rawPhone?: string | null) {
  if (typeof window === 'undefined') return;
  const digits = (rawPhone || '').replace(/\D/g, '');
  const phonePath = digits.length >= 8 ? digits : '';
  const url = `https://wa.me/${phonePath}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

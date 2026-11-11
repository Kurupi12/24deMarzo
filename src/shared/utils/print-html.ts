/**
 * Utilidad universal y aislada para impresión de documentos A4 y Tickets térmicos.
 * Utiliza un <iframe> invisible para garantizar que:
 * 1. Modales, overflows, backdrops y transforms de la aplicación no interfieran ni recorten la vista previa.
 * 2. Se defina @page { size: A4 portrait; margin: 4mm 5mm; } exacto.
 * 3. Todo el documento entre 100% en UNA sola hoja A4 sin saltos de página indeseados.
 * 4. La opción "Guardar como PDF" despliegue el documento nítido, centrado y con colores exactos.
 */

export interface PrintOptions {
  paperSize?: 'A4' | 'ticket';
  title?: string;
}

export function printElementById(elementId: string, options: PrintOptions = {}) {
  const { paperSize = 'A4', title = 'Documento' } = options;

  if (typeof window === 'undefined') return;

  const sourceElement = document.getElementById(elementId);
  if (!sourceElement) {
    console.error(`[printElementById] No se encontró el elemento con ID "${elementId}". Se ejecutará window.print() como respaldo.`);
    window.print();
    return;
  }

  // Eliminar iframe previo si existe
  const existingIframe = document.getElementById('print-sandbox-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  // Crear iframe invisible aislado
  const iframe = document.createElement('iframe');
  iframe.id = 'print-sandbox-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    console.error('[printElementById] No se pudo acceder al iframe. Fallback a window.print().');
    window.print();
    return;
  }

  // Recolectar todas las hojas de estilo y etiquetas <style> de la aplicación
  const headStyles: string[] = [];
  document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    headStyles.push(link.outerHTML);
  });
  document.querySelectorAll('style').forEach((styleTag) => {
    headStyles.push(styleTag.outerHTML);
  });

  const pageCss = paperSize === 'A4'
    ? `
      @page {
        size: A4 portrait;
        margin: 4mm 5mm;
      }
      .print-sandbox-container {
        width: 196mm !important;
        max-width: 196mm !important;
        margin: 0 auto !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    `
    : `
      @page {
        size: 80mm auto;
        margin: 2mm 3mm;
      }
      .print-sandbox-container {
        width: 74mm !important;
        max-width: 74mm !important;
        margin: 0 auto !important;
        padding: 0 !important;
        box-sizing: border-box !important;
      }
    `;

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        ${headStyles.join('\n')}
        <style>
          ${pageCss}
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            height: auto !important;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
          }
          .no-print {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div class="print-sandbox-container">
          ${sourceElement.outerHTML}
        </div>
      </body>
    </html>
  `);
  iframeDoc.close();

  const executePrint = () => {
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } else {
        window.print();
      }
    } catch (err) {
      console.error('[printElementById] Error al llamar print():', err);
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          iframe.remove();
        }
      }, 3500);
    }
  };

  setTimeout(executePrint, 250);
}


import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Renders an HTML element to a PDF Blob (A4 size).
 * Preserves aspect ratio — no squeezing/stretching.
 */
export async function exportToPdf(
  element: HTMLElement,
  orientation: 'portrait' | 'landscape' = 'portrait',
  filename?: string,
): Promise<Blob> {
  const canvas = await html2canvas(element, {
    scale: 3,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    imageTimeout: 0,
    allowTaint: true,
  });

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pdfWidth  = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Scale to fit page width, preserving aspect ratio
  const imgWidth  = pdfWidth;
  const imgHeight = (canvas.height / canvas.width) * pdfWidth;

  // If content fits in one page, center/place at top
  if (imgHeight <= pdfHeight) {
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, imgWidth, imgHeight);
  } else {
    // Multi-page: slice the canvas into page-height chunks
    const pageHeightPx = Math.floor((pdfHeight / imgWidth) * canvas.width);
    let yOffset = 0;
    let page = 0;
    while (yOffset < canvas.height) {
      if (page > 0) pdf.addPage();
      const sliceH = Math.min(pageHeightPx, canvas.height - yOffset);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width  = canvas.width;
      sliceCanvas.height = sliceH;
      const ctx = sliceCanvas.getContext('2d');
      ctx?.drawImage(canvas, 0, yOffset, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      const sliceImgH = (sliceH / canvas.width) * pdfWidth;
      pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfWidth, sliceImgH);
      yOffset += pageHeightPx;
      page++;
    }
  }

  const blob = pdf.output('blob');
  if (filename) pdf.save(filename);
  return blob;
}

/**
 * Renders raw HTML string to a PDF Blob (A4 size).
 * Uses an iframe for full document rendering (preserves head styles & fonts).
 */
export async function exportHtmlToPdf(
  htmlContent: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  filename?: string,
): Promise<Blob> {
  const W = orientation === 'landscape' ? 1123 : 794;
  const H = orientation === 'landscape' ? 794  : 1123;

  // Use iframe for proper HTML document rendering (head styles + Google Fonts)
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left     = '-9999px';
  iframe.style.top      = '0';
  iframe.style.width    = `${W}px`;
  iframe.style.height   = `${H}px`;
  iframe.style.border   = 'none';
  document.body.appendChild(iframe);

  await new Promise<void>((resolve) => {
    iframe.onload = () => resolve();
    const doc = iframe.contentDocument;
    if (!doc) { resolve(); return; }
    doc.open();
    doc.write(htmlContent);
    doc.close();
    // Fallback timeout in case onload doesn't fire
    setTimeout(resolve, 3000);
  });

  // Wait for fonts and images to load
  await new Promise((r) => setTimeout(r, 1200));

  const body = iframe.contentDocument?.documentElement || iframe.contentDocument?.body;
  if (!body) {
    document.body.removeChild(iframe);
    throw new Error('Failed to render HTML in iframe');
  }

  const canvas = await html2canvas(body, {
    scale: 3,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    width:  W,
    height: Math.max(H, body.scrollHeight || H),
    windowWidth:  W,
    windowHeight: Math.max(H, body.scrollHeight || H),
    imageTimeout: 0,
    allowTaint: true,
  });

  document.body.removeChild(iframe);

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pdfWidth  = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth  = pdfWidth;
  const imgHeight = (canvas.height / canvas.width) * pdfWidth;

  if (imgHeight <= pdfHeight) {
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, imgWidth, imgHeight);
  } else {
    const pageHeightPx = Math.floor((pdfHeight / imgWidth) * canvas.width);
    let yOffset = 0;
    let page = 0;
    while (yOffset < canvas.height) {
      if (page > 0) pdf.addPage();
      const sliceH = Math.min(pageHeightPx, canvas.height - yOffset);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width  = canvas.width;
      sliceCanvas.height = sliceH;
      const ctx = sliceCanvas.getContext('2d');
      ctx?.drawImage(canvas, 0, yOffset, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      const sliceImgH = (sliceH / canvas.width) * pdfWidth;
      pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfWidth, sliceImgH);
      yOffset += pageHeightPx;
      page++;
    }
  }

  const blob = pdf.output('blob');
  if (filename) pdf.save(filename);
  return blob;
}

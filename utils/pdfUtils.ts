// We assume pdfjsLib is loaded globally via CDN in index.html to avoid webpack/worker complexity in this environment
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

/**
 * Loads the PDF document from an ArrayBuffer. 
 * Creates a copy of the buffer to avoid issues if the original is transferred/detached.
 */
export const loadPdfDocument = async (pdfData: ArrayBuffer): Promise<any> => {
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) throw new Error("PDF.js library not loaded");
  
  // Use slice(0) to clone the buffer. pdfjs often transfers the buffer to a worker, 
  // making the original unusable. Cloning ensures we process a valid buffer.
  const loadingTask = pdfjsLib.getDocument({ data: pdfData.slice(0) });
  return await loadingTask.promise;
};

/**
 * Renders a specific page from a loaded PDFDocumentProxy to a Blob.
 */
export const renderPdfPage = async (pdfDoc: any, pageNum: number, dpi: number = 300): Promise<Blob> => {
  const page = await pdfDoc.getPage(pageNum);

  const scale = dpi / 72; // PDF.js defaults to 72dpi. 
  
  let viewport = page.getViewport({ scale: scale });
  
  // Safe downscale limit increased to 8192px (8k) to support high DPI on desktop.
  // Previously 2048px which caused blurriness on standard A4 @ 300dpi.
  const maxDim = 8192;
  if (viewport.width > maxDim || viewport.height > maxDim) {
    const ratio = Math.min(maxDim / viewport.width, maxDim / viewport.height);
    viewport = page.getViewport({ scale: scale * ratio });
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  if (!context) throw new Error("Canvas context not available");

  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;
  
  // Cleanup page resources
  page.cleanup();

  return new Promise((resolve, reject) => {
    // Use PNG for lossless intermediate quality before cropping
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas conversion failed"));
    }, 'image/png');
  });
};
import "client-only";
import type { PDFDocumentProxy } from "pdfjs-dist";

import type { PdfPageRender } from "@/features/documents/types/preview.types";
import {
  PDF_RENDER_MAX_DIMENSION,
  PDF_WORKER_PATH,
} from "@/lib/pdf/constants/pdf";

export async function openPdfDocument(url: string) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_PATH;
  return pdfjs.getDocument({
    url,
    enableXfa: false,
    useSystemFonts: true,
    stopAtErrors: true,
  }).promise;
}
export async function createPdfRender({
  document,
  pageNumber,
  canvas,
}: PdfPageRender) {
  if (
    !Number.isInteger(pageNumber) ||
    pageNumber < 1 ||
    pageNumber > document.numPages
  )
    throw new Error("Invalid PDF page");
  const page = await document.getPage(pageNumber);
  const natural = page.getViewport({ scale: 1 });
  const scale = Math.min(
    1.5,
    PDF_RENDER_MAX_DIMENSION / Math.max(natural.width, natural.height),
  );
  const viewport = page.getViewport({ scale });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  return page.render({ canvas, viewport });
}
function reportCleanupError() {
  console.error("No se pudo liberar el visor PDF.");
}
export function disposePdf(document: PDFDocumentProxy | null) {
  if (document) void document.loadingTask.destroy().catch(reportCleanupError);
}

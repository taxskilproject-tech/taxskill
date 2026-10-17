import type { PDFFont, PDFPage } from "pdf-lib";

export interface PdfTableColumn {
  label: string;
  width: number;
}
export interface PdfTableLayout {
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  top: number;
}

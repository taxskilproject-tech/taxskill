import type { PdfTableColumn } from "@/features/reporting/types/pdf.types";

export const PDF_COLUMNS: readonly PdfTableColumn[] = [
  { label: "Empresa / RUC", width: 104 },
  { label: "Área / clase", width: 91 },
  { label: "Periodo", width: 66 },
  { label: "Trabajador / ID", width: 91 },
  { label: "Obligación / tipo", width: 156 },
  { label: "Estado / registro", width: 91 },
  { label: "Plazo entrega", width: 67 },
  { label: "Archivos / entregas", width: 104 },
];
export const PDF_MARGIN = 30;
export const PDF_FONT_SIZE = 8;
export const PDF_LINE_HEIGHT = 11;

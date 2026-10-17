import { PDFDocument, StandardFonts } from "pdf-lib";

import type {
  ExportPayload,
  ReportRow,
} from "@/domain/reporting/types/reporting.types";
import {
  compliance,
  limaMoment,
} from "@/domain/reporting/utils/report-filters";
import {
  filterSummary,
  moduleLabel,
  periodLabel,
  recordLabel,
  stateLabel,
} from "@/domain/reporting/utils/report-labels";
import {
  PDF_COLUMNS,
  PDF_FONT_SIZE,
  PDF_LINE_HEIGHT,
  PDF_MARGIN,
} from "@/features/reporting/constants/pdf-report";
import type { PdfTableLayout } from "@/features/reporting/types/pdf.types";
import { pdfText, wrapPdfText } from "@/features/reporting/utils/pdf-text";

function values(row: ReportRow): string[] {
  return [
    `${row.company_name}\n${row.ruc ?? "Estudio"}`,
    `${moduleLabel(row.module)}\n${row.class === "additional" ? "Adicional" : "Documental"}`,
    periodLabel(row.period, row.period_start),
    `${row.worker_name || "—"}\n${row.worker_identity ?? ""}`,
    `${row.title}\n${row.document_type}`,
    `${stateLabel(row.state)}\n${recordLabel(row.record_status)}`,
    `${row.operational_due_date ?? "Sin entrega pendiente"}\nInicial: ${row.initial_due_date}`,
    `${row.approved_count}/${row.total_count} aprobados\n${row.submitted_cycles} ciclos entregados\n${row.late_cycles} fuera de plazo`,
  ];
}
function drawCells(
  layout: PdfTableLayout,
  cells: string[][],
  start: number,
  count: number,
) {
  let x = PDF_MARGIN;
  for (let index = 0; index < PDF_COLUMNS.length; index += 1) {
    const column = PDF_COLUMNS[index];
    const lines = cells[index].slice(start, start + count);
    lines.forEach((line, offset) =>
      layout.page.drawText(line, {
        x: x + 4,
        y: layout.top - 12 - offset * PDF_LINE_HEIGHT,
        font: layout.font,
        size: PDF_FONT_SIZE,
      }),
    );
    x += column.width;
  }
  layout.top -= count * PDF_LINE_HEIGHT + 8;
  layout.page.drawLine({
    start: { x: PDF_MARGIN, y: layout.top },
    end: { x: 800, y: layout.top },
    thickness: 0.3,
  });
}
function drawRow(
  row: ReportRow,
  initial: PdfTableLayout,
  addPage: () => PdfTableLayout,
): PdfTableLayout {
  let layout = initial;
  const cells = values(row).map((value, index) =>
    wrapPdfText(
      value,
      PDF_COLUMNS[index].width - 8,
      layout.font,
      PDF_FONT_SIZE,
    ),
  );
  const lines = Math.max(...cells.map((cell) => cell.length));
  let offset = 0;
  while (offset < lines) {
    if (layout.top < 80) layout = addPage();
    const count = Math.min(
      lines - offset,
      Math.floor((layout.top - 45) / PDF_LINE_HEIGHT) - 1,
    );
    drawCells(layout, cells, offset, count);
    offset += count;
    if (offset < lines) layout = addPage();
  }
  return layout;
}
export async function generatePdf(payload: ExportPayload): Promise<Blob> {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  function addPage(): PdfTableLayout {
    const page = document.addPage([842, 595]);
    page.drawText("TaxSkill · Supervisión documental", {
      x: PDF_MARGIN,
      y: 565,
      size: 14,
      font: bold,
    });
    page.drawText(
      pdfText(
        `Generado: ${limaMoment(payload.generatedAt)} Lima · Consulta: ${limaMoment(payload.queriedAt)} Lima · ${payload.rows.length} obligaciones`,
      ),
      { x: PDF_MARGIN, y: 546, size: 8, font },
    );
    page.drawText(
      pdfText(
        `Documental: ${payload.metrics.approved}/${payload.metrics.required} (${compliance(payload.metrics.approved, payload.metrics.required)}) · Adicional: ${payload.metrics.additional_approved}/${payload.metrics.additional_required} · Avance: archivos`,
      ),
      { x: PDF_MARGIN, y: 532, size: 8, font },
    );
    const layout = { page, font, bold, top: 513 };
    const headers = PDF_COLUMNS.map((column) =>
      wrapPdfText(column.label, column.width - 8, bold, 8),
    );
    drawCells({ ...layout, font: bold }, headers, 0, 2);
    layout.top = 482;
    return layout;
  }
  let layout = addPage();
  const filterLines = wrapPdfText(
    `Filtros: ${filterSummary(payload)}`,
    752,
    font,
    8,
  );
  const notes = [
    ...filterLines,
    "Las filas se verificaron antes de preparar el archivo. Los cambios posteriores pueden variar los resultados.",
    "Los registros inactivos y eliminados se identifican como históricos. Caracteres fuera de la fuente: [U+XXXX].",
  ];
  for (const line of notes) {
    if (layout.top < 60) layout = addPage();
    layout.page.drawText(pdfText(line), {
      x: PDF_MARGIN + 4,
      y: layout.top - 12,
      size: 8,
      font,
    });
    layout.top -= 13;
  }
  layout.top -= 10;
  for (const row of payload.rows) {
    layout = drawRow(row, layout, addPage);
  }
  document
    .getPages()
    .forEach((page, index) =>
      page.drawText(
        `Página ${index + 1} de ${document.getPageCount()} · America/Lima`,
        { x: PDF_MARGIN, y: 21, font, size: 8 },
      ),
    );
  const bytes = await document.save();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

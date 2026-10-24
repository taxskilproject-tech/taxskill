import type { Cell, SheetData } from "write-excel-file/universal";

import { REPORT_COLUMNS } from "@/domain/reporting/constants/report-columns";
import type {
  ExportPayload,
  ReportColumn,
  ReportRow,
} from "@/domain/reporting/types/reporting.types";
import {
  compliance,
  limaMoment,
  neutralizeSpreadsheetText,
} from "@/domain/reporting/utils/report-filters";

function text(value: string): Cell {
  return { type: String, value: neutralizeSpreadsheetText(value) };
}
function cell(column: ReportColumn, row: ReportRow): Cell {
  const value = column.value(row);
  if (value === null) return null;
  if (column.kind === "number" && typeof value === "number")
    return { type: Number, value };
  if (column.kind === "date" && typeof value === "string")
    return {
      type: Date,
      value: new Date(`${value}T00:00:00.000Z`),
      format: "dd/mm/yyyy",
    };
  return text(String(value));
}
export function reportSheet(payload: ExportPayload): SheetData {
  return [
    REPORT_COLUMNS.map((column) => ({
      type: String,
      value: column.label,
      fontWeight: "bold",
    })),
    ...payload.rows.map((row) =>
      REPORT_COLUMNS.map((column) => cell(column, row)),
    ),
  ];
}
export async function generateExcel(payload: ExportPayload): Promise<Blob> {
  const { default: writeXlsxFile } = await import("write-excel-file/universal");
  const summary: SheetData = [
    [text("TaxSkill · Reporte documental")],
    [text("Generado (Lima)"), text(limaMoment(payload.generatedAt))],
    [text("Consultado (Lima)"), text(limaMoment(payload.queriedAt))],
    [
      text("Unidad del detalle"),
      text("Obligaciones; el avance cuenta archivos"),
    ],
    [text("Filtros"), text(JSON.stringify(payload.filters))],
    [
      text("Exigibles documentales"),
      { type: Number, value: payload.metrics.required },
    ],
    [
      text("Aprobadas documentales"),
      { type: Number, value: payload.metrics.approved },
    ],
    [
      text("Cumplimiento documental"),
      text(compliance(payload.metrics.approved, payload.metrics.required)),
    ],
    [
      text("Adicionales exigibles"),
      { type: Number, value: payload.metrics.additional_required },
    ],
    [
      text("Adicionales aprobadas"),
      { type: Number, value: payload.metrics.additional_approved },
    ],
    [
      text("Empresa / alcance"),
      text("Módulo"),
      text("Clase"),
      text("Exigibles documentales"),
      text("Aprobadas documentales"),
    ],
    ...payload.groups.map((group) => [
      text(group.company_name),
      text(group.module),
      text(group.class),
      { type: Number, value: group.required },
      { type: Number, value: group.approved },
    ]),
  ];
  return writeXlsxFile([
    {
      sheet: "Obligaciones",
      data: reportSheet(payload),
      columns: REPORT_COLUMNS.map(() => ({ width: 24 })),
      stickyRowsCount: 1,
    },
    {
      sheet: "Resumen",
      data: summary,
      columns: [
        { width: 36 },
        { width: 65 },
        { width: 24 },
        { width: 24 },
        { width: 24 },
      ],
    },
  ]).toBlob();
}

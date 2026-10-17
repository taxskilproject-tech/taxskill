import type { z } from "zod";

import type {
  exportReceiptSchema,
  reportFiltersSchema,
  reportGroupSchema,
  reportMetricsSchema,
  reportResultSchema,
  reportRowSchema,
} from "@/domain/reporting/contracts/reporting.schema";

export type ReportFilters = z.infer<typeof reportFiltersSchema>;
export type ReportFilterName = keyof ReportFilters;
export type ReportRow = z.infer<typeof reportRowSchema>;
export type ReportGroup = z.infer<typeof reportGroupSchema>;
export type ReportMetrics = z.infer<typeof reportMetricsSchema>;
export type ReportResult = z.infer<typeof reportResultSchema>;
export type ExportReceipt = z.infer<typeof exportReceiptSchema>;
export type ExportFormat = "xlsx" | "pdf";
export interface ExportPayload {
  rows: ReportRow[];
  metrics: ReportMetrics;
  groups: ReportGroup[];
  filters: ReportFilters;
  generatedAt: string;
  queriedAt: string;
  format: ExportFormat;
}
export interface ReportColumn {
  label: string;
  kind: "text" | "number" | "date";
  value: (row: ReportRow) => string | number | null;
}
export interface ExportWorkerMessage {
  blob?: Blob;
  error?: string;
}

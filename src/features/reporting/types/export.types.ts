import type {
  ExportFormat,
  ExportPayload,
  ExportReceipt,
  ReportFilters,
  ReportResult,
  ReportRow,
} from "@/domain/reporting/types/reporting.types";

export interface ExportRun {
  controller: AbortController;
  identity: string;
}
export interface FetchReportPagesOptions {
  receipt: ExportReceipt;
  filters: ReportFilters;
  signal: AbortSignal;
  fetchPage: (
    filters: ReportFilters,
    signal: AbortSignal,
  ) => Promise<ReportResult>;
  onProgress: (message: string) => void;
}
export interface ReportExportOptions {
  organizationId: string;
  format: ExportFormat;
  filters: ReportFilters;
  result: ReportResult;
  signal: AbortSignal;
  onProgress: (message: string) => void;
}
export interface GeneratedReport {
  blob: Blob;
  filename: string;
  rows: ReportRow[];
}
export interface ExportWorkerOptions {
  payload: ExportPayload;
  signal: AbortSignal;
}
export interface ExportAuditTransport {
  signal?: AbortSignal;
  timeoutMs?: number;
}
export interface TimedExportRequest<T> extends ExportAuditTransport {
  request: (signal: AbortSignal) => PromiseLike<T>;
}
export interface ExportReconciliationOptions {
  organizationId: string;
  requestId: string;
  filters: ReportFilters;
  format: ExportFormat;
  outcome: "cancelled" | "failed";
  onProgress: (message: string) => void;
}

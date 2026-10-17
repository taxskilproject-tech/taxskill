import type {
  ReportFilterName,
  ReportFilters,
  ReportMetrics,
  ReportResult,
  ReportRow,
} from "@/domain/reporting/types/reporting.types";

export interface ReportFilterProps {
  filters: ReportFilters;
  onChange: (name: ReportFilterName, value: string) => void;
  audit?: boolean;
}
export interface ReportMetricsProps {
  metrics: ReportMetrics;
  filters: ReportFilters;
  mode: ReportingPageProps["mode"];
}
export interface ReportTableProps {
  rows: ReportRow[];
  origin: string;
}
export interface ExportControlsProps {
  result: ReportResult;
  filters: ReportFilters;
  allowed: boolean;
}
export interface CompanyReportingProps {
  companyId: string;
}
export interface ReportingPageProps {
  mode: "dashboard" | "report";
}

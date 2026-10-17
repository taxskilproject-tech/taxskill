import type { ReportIndicatorDefinition } from "@/features/reporting/types/reporting-ui.types";

export const REPORT_INDICATORS: ReportIndicatorDefinition[] = [
  {
    indicator: "pending",
    label: "Obligaciones pendientes de aprobación",
    metric: "pending",
  },
  {
    indicator: "review",
    label: "Archivos por revisar",
    metric: "review_files",
  },
  {
    indicator: "observed",
    label: "Archivos observados",
    metric: "observed_files",
  },
  {
    indicator: "overdue",
    label: "Obligaciones con entrega vencida",
    metric: "overdue",
  },
  {
    indicator: "upcoming",
    label: "Obligaciones con próxima entrega",
    metric: "upcoming",
  },
];

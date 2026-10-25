import type { ReportIndicatorDefinition } from "@/features/reporting/types/reporting-ui.types";

export const REPORT_INDICATORS: ReportIndicatorDefinition[] = [
  {
    indicator: "overdue",
    label: "Obligaciones con entrega vencida",
    metric: "overdue",
    shortLabel: "Entregas vencidas",
    tone: "danger",
    icon: "activity",
  },
  {
    indicator: "upcoming",
    label: "Obligaciones con próxima entrega",
    metric: "upcoming",
    shortLabel: "Próximas entregas",
    tone: "cyan",
    icon: "activity",
  },
  {
    indicator: "review",
    label: "Archivos por revisar",
    metric: "review_files",
    shortLabel: "Archivos por revisar",
    tone: "blue",
    icon: "document",
  },
  {
    indicator: "observed",
    label: "Archivos observados",
    metric: "observed_files",
    shortLabel: "Archivos observados",
    tone: "warning",
    icon: "audit",
  },
  {
    indicator: "pending",
    label: "Obligaciones pendientes de aprobación",
    metric: "pending",
    shortLabel: "Pendientes de aprobación",
    tone: "neutral",
    icon: "report",
  },
];

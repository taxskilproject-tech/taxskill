import type { ReportFilters } from "@/domain/reporting/types/reporting.types";
import {
  moduleLabel,
  stateLabel,
} from "@/domain/reporting/utils/report-labels";

const OMIT = new Set(["page", "pageSize", "report", "sort", "scope"]);
const LABELS: Readonly<Record<string, string>> = {
  company_id: "Empresa",
  q: "Búsqueda",
  period: "Periodo",
  worker_id: "Trabajador",
  document_type_id: "Tipo documental",
  actor_id: "Actor",
  resource: "Recurso",
  action: "Acción",
  due_from: "Desde",
  due_to: "Hasta",
  from: "Desde",
  to: "Hasta",
  year: "Año",
  month: "Mes",
  class: "Clase",
  include_deleted: "Históricos",
  indicator: "Indicador",
  indicators: "Indicadores",
};
export function activeReportFilters(filters: ReportFilters): string[] {
  return Object.entries(filters)
    .filter(
      ([key, value]) =>
        !OMIT.has(key) &&
        value !== undefined &&
        value !== "" &&
        value !== false &&
        (!Array.isArray(value) || value.length > 0),
    )
    .map(([key, value]) => {
      if (key === "module") return moduleLabel(String(value));
      if (key === "state") return stateLabel(String(value));
      return LABELS[key] ?? key;
    });
}

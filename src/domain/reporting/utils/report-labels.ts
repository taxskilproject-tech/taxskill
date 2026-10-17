import { REVIEW_LABELS } from "@/domain/documents/constants/documents";
import { MODULE_LABELS } from "@/domain/documents/constants/engine";
import type {
  ExportPayload,
  ReportFilters,
} from "@/domain/reporting/types/reporting.types";

export function moduleLabel(value: string): string {
  return (
    Reflect.get(MODULE_LABELS, value) ??
    (value === "actividades" ? "Actividades adicionales" : value)
  );
}
export function stateLabel(value: string): string {
  return Reflect.get(REVIEW_LABELS, value) ?? value;
}
export function recordLabel(value: string): string {
  return value === "deleted"
    ? "Eliminado · histórico"
    : value === "inactive"
      ? "Inactivo · histórico"
      : "Vigente";
}
export function periodLabel(key: string, start: string): string {
  if (key.startsWith("unique:")) return `Única · ${start}`;
  if (key.startsWith("event:")) return `Eventual · ${start}`;
  return key;
}
const FILTER_LABELS: Readonly<Record<keyof ReportFilters, string>> = {
  indicator: "Indicador",
  indicators: "Indicadores (todos)",
  company_id: "Empresa",
  scope: "Alcance",
  module: "Área",
  class: "Clase",
  state: "Estado",
  q: "Búsqueda",
  period: "Periodo",
  year: "Año",
  month: "Mes",
  worker_id: "Trabajador",
  document_type_id: "Tipo documental",
  due_from: "Entrega desde",
  due_to: "Entrega hasta",
  include_deleted: "Incluir históricos",
  report: "Informe",
  page: "Página",
  pageSize: "Tamaño",
  sort: "Orden",
  actor_id: "Actor",
  resource: "Recurso",
  action: "Acción",
  from: "Desde",
  to: "Hasta",
};
const FILTER_VALUES: Readonly<Record<string, string>> = {
  all: "Todo el alcance autorizado",
  company: "Empresas",
  internal: "Internas del estudio",
  documentary: "Documental",
  additional: "Adicional",
  detail: "Detalle",
  compliance: "Cumplimiento",
  pending: "Pendientes",
  deadlines: "Vencimientos",
  observed: "Observaciones",
  period: "Por periodo",
  review: "Archivos por revisar",
  overdue: "Entregas vencidas",
  upcoming: "Próximas entregas",
  due: "Plazo de entrega",
  title: "Título",
};
export function filterSummary(payload: ExportPayload): string {
  return Object.entries(payload.filters)
    .filter(
      ([key, value]) =>
        value !== undefined &&
        value !== "" &&
        (!Array.isArray(value) || value.length > 0) &&
        key !== "page" &&
        key !== "pageSize",
    )
    .map(([key, value]) => {
      const translated = Array.isArray(value)
        ? value.map((item) => FILTER_VALUES[item] ?? item).join(" + ")
        : (FILTER_VALUES[String(value)] ??
          stateLabel(moduleLabel(String(value))));
      const company =
        key === "company_id"
          ? payload.rows.find((row) => row.company_id === value)?.company_name
          : undefined;
      return `${Reflect.get(FILTER_LABELS, key)}: ${typeof value === "boolean" ? (value ? "Sí" : "No") : (company ?? translated)}`;
    })
    .join(" · ");
}

import type { ReportColumn } from "@/domain/reporting/types/reporting.types";

export const REPORT_COLUMNS: readonly ReportColumn[] = [
  { label: "Empresa / alcance", kind: "text", value: (r) => r.company_name },
  { label: "RUC", kind: "text", value: (r) => r.ruc },
  { label: "Módulo", kind: "text", value: (r) => r.module },
  { label: "Clase", kind: "text", value: (r) => r.class },
  { label: "Periodo", kind: "text", value: (r) => r.period },
  { label: "Inicio periodo", kind: "date", value: (r) => r.period_start },
  { label: "Fin periodo", kind: "date", value: (r) => r.period_end },
  { label: "Trabajador", kind: "text", value: (r) => r.worker_name },
  { label: "Identificación", kind: "text", value: (r) => r.worker_identity },
  { label: "Tipo documental", kind: "text", value: (r) => r.document_type },
  { label: "Obligación", kind: "text", value: (r) => r.title },
  { label: "Estado", kind: "text", value: (r) => r.state },
  { label: "Plazo inicial", kind: "date", value: (r) => r.initial_due_date },
  {
    label: "Entrega pendiente hasta",
    kind: "date",
    value: (r) => r.operational_due_date,
  },
  {
    label: "Archivos aprobados",
    kind: "number",
    value: (r) => r.approved_count,
  },
  { label: "Archivos requeridos", kind: "number", value: (r) => r.total_count },
  {
    label: "Ciclos entregados",
    kind: "number",
    value: (r) => r.submitted_cycles,
  },
  {
    label: "Ciclos entregados tarde",
    kind: "number",
    value: (r) => r.late_cycles,
  },
  {
    label: "Exigible documental",
    kind: "text",
    value: (r) => (r.required ? "Sí" : "No"),
  },
  {
    label: "Aprobada documental",
    kind: "text",
    value: (r) => (r.approved ? "Sí" : "No"),
  },
  { label: "Registro", kind: "text", value: (r) => r.record_status },
];
export const EXPORT_BATCH_SIZE = 500;
export const EXPORT_MAX_ROWS = 30000;

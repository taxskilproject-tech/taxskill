import { RecordInspector } from "@/components/organisms/record-inspector";
import {
  moduleLabel,
  periodLabel,
  recordLabel,
  stateLabel,
} from "@/domain/reporting/utils/report-labels";
import { displayDate } from "@/features/documents/utils/document-presentation";
import type { ReportRowDetailProps } from "@/features/reporting/types/reporting-ui.types";

export function ReportRowDetail({ row }: ReportRowDetailProps) {
  return (
    <RecordInspector title={row.title}>
      <dl className="grid grid-cols-[auto_1fr] gap-3 text-sm">
        <dt>Empresa</dt>
        <dd>
          {row.company_name} · {row.ruc ?? "Interna del estudio"}
        </dd>
        <dt>Módulo</dt>
        <dd>{moduleLabel(row.module)}</dd>
        <dt>Periodo</dt>
        <dd>{periodLabel(row.period, row.period_start)}</dd>
        <dt>Trabajador</dt>
        <dd>
          {row.worker_name || "No corresponde"} {row.worker_identity}
        </dd>
        <dt>Tipo documental</dt>
        <dd>{row.document_type}</dd>
        <dt>Registro</dt>
        <dd>{recordLabel(row.record_status)}</dd>
        <dt>Cumplimiento</dt>
        <dd>
          {row.class === "additional"
            ? "Indicador adicional"
            : row.required
              ? "Documental obligatorio"
              : "Documental opcional"}
        </dd>
        <dt>Estado documental</dt>
        <dd>{stateLabel(row.state)}</dd>
        <dt>Entrega hasta</dt>
        <dd>
          {displayDate(row.operational_due_date)}
          {row.overdue ? " · Entrega vencida" : ""}
        </dd>
        <dt>Plazo inicial</dt>
        <dd>{displayDate(row.initial_due_date)}</dd>
        <dt>Avance</dt>
        <dd>
          {row.approved_count}/{row.total_count} archivos aprobados
        </dd>
        <dt>Entregas recibidas</dt>
        <dd>
          {row.submitted_cycles} ciclos · {row.late_cycles} fuera de plazo
        </dd>
      </dl>
    </RecordInspector>
  );
}

import Link from "next/link";

import {
  moduleLabel,
  periodLabel,
  recordLabel,
  stateLabel,
} from "@/domain/reporting/utils/report-labels";
import type { ReportTableProps } from "@/features/reporting/types/reporting-ui.types";

export function ReportMobileRows({ rows, origin }: ReportTableProps) {
  return (
    <ul
      aria-label="Obligaciones del reporte"
      className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white xl:hidden"
    >
      {rows.map((row) => (
        <li className="space-y-1 p-3" key={row.id}>
          {row.record_status === "deleted" ? (
            <p className="font-medium">{row.title}</p>
          ) : (
            <Link
              className="inline-flex min-h-11 items-center font-medium underline-offset-4 hover:underline"
              href={`/actividades/${row.id}?returnTo=${encodeURIComponent(origin)}`}
            >
              {row.title}
            </Link>
          )}
          <p className="text-xs text-zinc-500">
            {row.company_name} · {moduleLabel(row.module)}
          </p>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span>
              {stateLabel(row.state)} · {row.approved_count}/{row.total_count}
            </span>
            <span>{row.operational_due_date ?? "Sin entrega pendiente"}</span>
          </div>
          {row.overdue && (
            <p className="text-xs font-medium text-red-700">Entrega vencida</p>
          )}
          <details>
            <summary className="min-h-11 cursor-pointer py-3 text-xs">
              Ver periodo y datos adicionales
            </summary>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <dt>Periodo</dt>
              <dd>{periodLabel(row.period, row.period_start)}</dd>
              <dt>Trabajador</dt>
              <dd>{row.worker_name || "No corresponde"}</dd>
              <dt>Identificación</dt>
              <dd>{row.worker_identity ?? "Sin registrar"}</dd>
              <dt>Tipo</dt>
              <dd>{row.document_type}</dd>
              <dt>Registro</dt>
              <dd>{recordLabel(row.record_status)}</dd>
              <dt>Plazo inicial</dt>
              <dd>{row.initial_due_date}</dd>
              <dt>Ciclos recibidos / tardíos</dt>
              <dd>
                {row.submitted_cycles} / {row.late_cycles}
              </dd>
            </dl>
          </details>
        </li>
      ))}
    </ul>
  );
}

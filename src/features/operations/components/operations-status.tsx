import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { formatLimaDateTime } from "@/domain/time/utils/instant";
import {
  JOB_LABELS,
  JOB_STATUS_LABELS,
  OPERATION_METRICS,
} from "@/features/operations/constants/operations";
import type { OperationsStatusProps } from "@/features/operations/types/operations.types";

function jobInstant(value: string | null): string {
  if (!value) return "Sin ejecución";
  const formatted = formatLimaDateTime(value);
  return formatted.ok ? formatted.data + " (Lima)" : "Fecha no disponible";
}

export function OperationsStatus({ snapshot }: OperationsStatusProps) {
  return (
    <div className="space-y-6">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {OPERATION_METRICS.map((metric) => (
          <div
            className="rounded-lg border border-zinc-200 p-4"
            key={metric.key}
          >
            <dt className="text-sm text-zinc-600">{metric.label}</dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums">
              {snapshot[metric.key]}
            </dd>
          </div>
        ))}
      </dl>
      {snapshot.backup_overdue && (
        <FeedbackMessage kind="error">
          No hay un respaldo confirmado dentro del plazo operativo. Revisa el
          ejecutor de copias.
        </FeedbackMessage>
      )}
      <section aria-labelledby="operation-jobs" className="space-y-3">
        <h3 className="font-medium" id="operation-jobs">
          Procesos programados
        </h3>
        {!snapshot.jobs.length && (
          <p className="text-sm text-zinc-600">
            La programación aún no está configurada.
          </p>
        )}
        <ul className="divide-y divide-zinc-200">
          {snapshot.jobs.map((job) => (
            <li
              className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              key={job.name}
            >
              <div className="space-y-1">
                <span>{JOB_LABELS[job.name] ?? "Proceso programado"}</span>
                <p className="text-xs text-zinc-600">
                  Último inicio: {jobInstant(job.last_started_at)}
                </p>
              </div>
              <span className="text-zinc-600">
                {job.active ? "Activo" : "Detenido"} ·{" "}
                {job.last_status
                  ? (JOB_STATUS_LABELS[job.last_status] ?? "Revisar estado")
                  : "Sin ejecución"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

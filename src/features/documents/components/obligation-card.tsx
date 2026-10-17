import Link from "next/link";

import { Badge } from "@/components/atoms/badge";
import { REVIEW_LABELS } from "@/domain/documents/constants/documents";
import type { ObligationCardProps } from "@/features/documents/types/document-ui.types";

export function ObligationCard({
  obligation,
  origin = "/actividades",
}: ObligationCardProps) {
  return (
    <article className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-zinc-200 bg-white p-5">
      <div className="min-w-0 space-y-2">
        <p className="text-xs text-zinc-500">
          {obligation.company_name ?? "Interna del estudio"} ·{" "}
          {obligation.occurrence_key.startsWith("event:")
            ? "Solicitud eventual"
            : obligation.occurrence_key.startsWith("unique:")
              ? "Actividad única"
              : obligation.occurrence_key}
        </p>
        <Link
          className="inline-flex min-h-11 items-center text-lg font-semibold tracking-tight underline-offset-4 hover:underline focus-visible:outline-2"
          href={`/actividades/${obligation.id}?returnTo=${encodeURIComponent(origin)}`}
        >
          {obligation.title}
        </Link>
        <p className="text-sm text-zinc-600">
          {obligation.worker_name && (
            <span className="block">
              {obligation.worker_name} · Etapa {obligation.employment_sequence}
            </span>
          )}
          {obligation.approved_count}/{obligation.total_count} archivos
          aprobados · Prioridad {obligation.priority}
        </p>
        <p className="text-sm text-zinc-600">
          {obligation.operational_due_date &&
          obligation.disposition === "active"
            ? `Entrega hasta ${obligation.operational_due_date}`
            : obligation.disposition === "active"
              ? "Sin entregas pendientes; consulta la revisión"
              : "Excluida de las obligaciones exigibles"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge>{REVIEW_LABELS[obligation.aggregate_state]}</Badge>
        {obligation.overdue && <Badge>Entrega vencida</Badge>}
        {obligation.assignment_issue && <Badge>Revisar responsable</Badge>}
      </div>
    </article>
  );
}

import { limaMoment } from "@/domain/reporting/utils/report-filters";
import {
  moduleLabel,
  recordLabel,
} from "@/domain/reporting/utils/report-labels";
import type { AuditEventRowProps } from "@/features/reporting/types/audit-ui.types";
import { auditActionLabel } from "@/features/reporting/utils/audit-labels";

export function AuditEventRow({ event }: AuditEventRowProps) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <div className="grid gap-1 text-sm sm:grid-cols-[minmax(0,1fr)_auto]">
        <h2 className="font-medium">{auditActionLabel(event.action)}</h2>
        <p className="text-xs text-zinc-500">
          {limaMoment(event.created_at)} · Lima
        </p>
        <p className="text-xs text-zinc-600">
          {event.actor_kind === "system" ? "Sistema" : event.actor_name} ·{" "}
          {event.company_name ?? "Estudio"} ·{" "}
          {event.module ? moduleLabel(event.module) : "Administración"}
        </p>
      </div>
      <details>
        <summary className="min-h-11 cursor-pointer py-3 text-xs">
          Ver transición y resultado
        </summary>
        <p className="mb-2 text-xs break-all text-zinc-500">
          {recordLabel(event.record_status)} · {event.resource_table} ·{" "}
          {event.resource_id} · {event.action}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <pre className="rounded-lg bg-zinc-50 p-3 text-xs whitespace-pre-wrap break-all">
            Antes: {JSON.stringify(event.before_values, null, 2)}
          </pre>
          <pre className="rounded-lg bg-zinc-50 p-3 text-xs whitespace-pre-wrap break-all">
            Después: {JSON.stringify(event.after_values, null, 2)}
          </pre>
        </div>
        <pre className="mt-2 text-xs whitespace-pre-wrap break-all">
          {JSON.stringify(event.metadata, null, 2)}
        </pre>
      </details>
    </article>
  );
}

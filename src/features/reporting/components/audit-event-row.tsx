import { RecordInspector } from "@/components/organisms/record-inspector";
import { limaMoment } from "@/domain/reporting/utils/report-filters";
import {
  moduleLabel,
  recordLabel,
} from "@/domain/reporting/utils/report-labels";
import type { AuditEventRowProps } from "@/features/reporting/types/audit-ui.types";
import { auditActionLabel } from "@/features/reporting/utils/audit-labels";

export function AuditEventRow({ event }: AuditEventRowProps) {
  return (
    <article className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1">
      <div className="min-w-0 text-sm">
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
      <RecordInspector title={auditActionLabel(event.action)}>
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
      </RecordInspector>
    </article>
  );
}

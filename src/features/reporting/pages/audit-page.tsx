"use client";
import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { ResourceState } from "@/components/organisms/resource-state";
import { auditResultSchema } from "@/domain/reporting/contracts/consultation.schema";
import { limaMoment } from "@/domain/reporting/utils/report-filters";
import { PageHeading } from "@/features/access/components/page-heading";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { ReportFilters } from "@/features/reporting/components/report-filters";
import { useReportFilters } from "@/features/reporting/hooks/use-report-filters";
import { useReportQuery } from "@/features/reporting/hooks/use-report-query";

export function AuditPage() {
  const { context } = useWorkspace();
  const { filters, error, change, reset } = useReportFilters();
  const allowed =
    context.member.is_admin ||
    context.capabilities.some((item) => item.action === "audit.view");
  const query = useReportQuery(
    "audit",
    filters,
    auditResultSchema,
    allowed && !error,
  );
  if (!allowed)
    return (
      <ResourceState
        description="Se necesita el permiso audit.view para consultar eventos."
        kind="forbidden"
        title="Auditoría sin acceso"
      />
    );
  return (
    <div className="space-y-6">
      <PageHeading
        description="Historial de acciones de usuarios y del sistema. Consulta de solo lectura con transiciones mínimas, sin contenido de archivos ni datos sensibles."
        title="Auditoría"
      />
      <ReportFilters audit filters={filters} onChange={change} />
      <Button onClick={reset} variant="secondary">
        Limpiar filtros
      </Button>
      {error ? (
        <FeedbackMessage kind="error">{error}</FeedbackMessage>
      ) : (
        <QueryState
          error={query.error}
          loading={query.isPending}
          onRetry={() => {
            void query.refetch();
          }}
          retrying={query.isFetching}
        >
          {query.data && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-500">
                Consulta: {limaMoment(query.data.queried_at)} · Lima · Unidad:
                eventos de auditoría.
              </p>
              {query.data.rows.map((event) => (
                <article
                  className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5"
                  key={event.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{event.action}</h2>
                      <p className="mt-1 text-sm text-zinc-600">
                        {event.actor_kind === "system"
                          ? "Sistema"
                          : event.actor_name}{" "}
                        · {limaMoment(event.created_at)} Lima
                      </p>
                    </div>
                    <span className="text-xs text-zinc-500">
                      {event.record_status}
                    </span>
                  </div>
                  <p className="text-sm">
                    {event.company_name ?? "Estudio / alcance general"} ·{" "}
                    {event.module ?? "Administración"}
                  </p>
                  <p className="text-xs break-all text-zinc-500">
                    {event.resource_table} · {event.resource_id}
                  </p>
                  <details>
                    <summary className="min-h-11 cursor-pointer py-3 text-sm">
                      Ver transición y resultado
                    </summary>
                    <div className="grid gap-3 text-xs sm:grid-cols-2">
                      <pre className="overflow-x-auto rounded-lg bg-zinc-50 p-3 whitespace-pre-wrap break-all">
                        Antes: {JSON.stringify(event.before_values, null, 2)}
                      </pre>
                      <pre className="overflow-x-auto rounded-lg bg-zinc-50 p-3 whitespace-pre-wrap break-all">
                        Después: {JSON.stringify(event.after_values, null, 2)}
                      </pre>
                    </div>
                    <pre className="mt-3 overflow-x-auto text-xs whitespace-pre-wrap break-all">
                      {JSON.stringify(event.metadata, null, 2)}
                    </pre>
                  </details>
                </article>
              ))}
              {query.data.count === 0 && (
                <ResourceState
                  description="No existen eventos visibles con esos filtros."
                  kind="empty"
                  title="Sin eventos"
                />
              )}
              <Pagination
                count={query.data.count}
                onPage={(page) => change("page", String(page))}
                page={filters.page}
                pageSize={filters.pageSize}
              />
            </div>
          )}
        </QueryState>
      )}
    </div>
  );
}

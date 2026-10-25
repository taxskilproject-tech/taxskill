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
import { AuditEventRow } from "@/features/reporting/components/audit-event-row";
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
    <div className="space-y-3">
      <PageHeading
        description="Acciones y cambios dentro de tu alcance autorizado."
        title="Auditoría"
      />
      <ReportFilters
        busy={query.isFetching}
        audit
        filters={filters}
        onChange={change}
      />
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
            <div className="space-y-0.5">
              <p className="text-xs text-zinc-500">
                Consulta: {limaMoment(query.data.queried_at)} · Lima · Unidad:
                eventos de auditoría.
              </p>
              <Pagination
                count={query.data.count}
                onPage={(page) => change("page", String(page))}
                page={filters.page}
                pageSize={filters.pageSize}
              />
              {query.data.rows.map((event) => (
                <AuditEventRow event={event} key={event.id} />
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

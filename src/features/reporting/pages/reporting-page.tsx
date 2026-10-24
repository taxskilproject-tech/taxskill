"use client";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { FilterDisclosure } from "@/components/molecules/filter-disclosure";
import { ResourceState } from "@/components/organisms/resource-state";
import { reportResultSchema } from "@/domain/reporting/contracts/reporting.schema";
import { limaMoment } from "@/domain/reporting/utils/report-filters";
import { PageHeading } from "@/features/access/components/page-heading";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { ReportFilters } from "@/features/reporting/components/report-filters";
import { ReportGroups } from "@/features/reporting/components/report-groups";
import { ReportMetrics } from "@/features/reporting/components/report-metrics";
import { ReportTable } from "@/features/reporting/components/report-table";
import { ReportToolbar } from "@/features/reporting/components/report-toolbar";
import { useReportFilters } from "@/features/reporting/hooks/use-report-filters";
import { useReportQuery } from "@/features/reporting/hooks/use-report-query";
import type { ReportingPageProps } from "@/features/reporting/types/reporting-ui.types";

export function ReportingPage({ mode }: ReportingPageProps) {
  const { context } = useWorkspace();
  const { filters, error, change, reset, origin } = useReportFilters();
  const allowed =
    mode === "dashboard" ||
    context.member.is_admin ||
    context.capabilities.some((item) => item.action === "reports.view");
  const exporting =
    context.member.is_admin ||
    context.capabilities.some((item) => item.action === "reports.export");
  const query = useReportQuery(
    mode,
    filters,
    reportResultSchema,
    allowed && !error,
  );
  if (!allowed)
    return (
      <ResourceState
        description="Solicita acceso al administrador para consultar reportes."
        kind="forbidden"
        title="Reportes sin acceso"
      />
    );
  return (
    <div className="space-y-3">
      <PageHeading
        description="Consulta obligaciones, cumplimiento y vencimientos."
        title="Reportes"
      />
      <ReportFilters
        busy={query.isFetching}
        filters={filters}
        onChange={change}
      />
      <ReportToolbar
        filters={filters}
        onChange={change}
        onReset={reset}
        result={query.data}
        allowed={exporting}
      />
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
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">
                Consulta: {limaMoment(query.data.queried_at)} · Lima
              </p>
              {filters.include_deleted && (
                <FeedbackMessage kind="info">
                  Consulta histórica: incluye registros inactivos y eliminados
                  identificados en cada fila.
                </FeedbackMessage>
              )}
              <Pagination
                count={query.data.count}
                onPage={(page) => change("page", String(page))}
                page={filters.page}
                pageSize={filters.pageSize}
              />
              {filters.report === "compliance" ? (
                <ReportGroups groups={query.data.groups} />
              ) : (
                <ReportTable origin={origin} rows={query.data.rows} />
              )}
              {query.data.count > 0 && (
                <Pagination
                  count={query.data.count}
                  onPage={(page) => change("page", String(page))}
                  page={filters.page}
                  pageSize={filters.pageSize}
                />
              )}
              <FilterDisclosure label="Indicadores y desglose">
                <ReportMetrics
                  filters={filters}
                  metrics={query.data.metrics}
                  mode={mode}
                />
                {filters.report !== "compliance" && (
                  <ReportGroups groups={query.data.groups} />
                )}
              </FilterDisclosure>
            </div>
          )}
        </QueryState>
      )}
    </div>
  );
}

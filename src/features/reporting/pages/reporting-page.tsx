"use client";
import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { SelectField } from "@/components/molecules/select-field";
import { ResourceState } from "@/components/organisms/resource-state";
import { reportResultSchema } from "@/domain/reporting/contracts/reporting.schema";
import { limaMoment } from "@/domain/reporting/utils/report-filters";
import { PageHeading } from "@/features/access/components/page-heading";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { ExportControls } from "@/features/reporting/components/export-controls";
import { ReportFilters } from "@/features/reporting/components/report-filters";
import { ReportGroups } from "@/features/reporting/components/report-groups";
import { ReportMetrics } from "@/features/reporting/components/report-metrics";
import { ReportTable } from "@/features/reporting/components/report-table";
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
        description="Solicita al administrador el permiso reports.view para el alcance requerido."
        kind="forbidden"
        title="Reportes sin acceso"
      />
    );
  return (
    <div className="space-y-6">
      <PageHeading
        description="Indicadores conciliados por obligación y archivo, dentro de tu alcance autorizado."
        title={mode === "dashboard" ? "Supervisión documental" : "Reportes"}
      />
      <ReportFilters filters={filters} onChange={change} />
      {mode === "report" && (
        <SelectField
          id="report-kind"
          label="Reporte"
          onChange={(e) => change("report", e.target.value)}
          value={filters.report}
        >
          <option value="detail">Detalle de obligaciones</option>
          <option value="compliance">Cumplimiento por empresa y área</option>
          <option value="pending">Pendientes de aprobación</option>
          <option value="deadlines">Vencimientos de entrega pendientes</option>
          <option value="observed">Observaciones</option>
          <option value="period">Detalle por periodo</option>
        </SelectField>
      )}
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
            <div className="space-y-6">
              <p className="text-xs text-zinc-500">
                Última consulta: {limaMoment(query.data.queried_at)} · Lima. Los
                cambios posteriores requieren actualizar la consulta.
              </p>
              {filters.include_deleted && (
                <FeedbackMessage kind="info">
                  Consulta histórica administrativa: incluye registros inactivos
                  y eliminados identificados en cada fila. Este universo puede
                  diferir del operativo.
                </FeedbackMessage>
              )}
              <ReportMetrics
                filters={filters}
                metrics={query.data.metrics}
                mode={mode}
              />
              {(mode === "dashboard" || filters.report === "compliance") && (
                <ReportGroups groups={query.data.groups} />
              )}
              {mode === "report" && (
                <ExportControls
                  allowed={exporting}
                  filters={filters}
                  result={query.data}
                />
              )}
              <ReportTable origin={origin} rows={query.data.rows} />
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

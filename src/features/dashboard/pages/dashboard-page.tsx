"use client";

import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { FilterDisclosure } from "@/components/molecules/filter-disclosure";
import { reportResultSchema } from "@/domain/reporting/contracts/reporting.schema";
import { activeReportIndicators } from "@/domain/reporting/utils/report-indicators";
import { PageHeading } from "@/features/access/components/page-heading";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { canReviewScope } from "@/features/auth/utils/review-access";
import { DashboardShortcuts } from "@/features/dashboard/components/dashboard-shortcuts";
import { ActiveReportIndicators } from "@/features/reporting/components/active-report-indicators";
import { ReportFilters } from "@/features/reporting/components/report-filters";
import { ReportGroups } from "@/features/reporting/components/report-groups";
import { ReportMetrics } from "@/features/reporting/components/report-metrics";
import { ReportTable } from "@/features/reporting/components/report-table";
import { useReportFilters } from "@/features/reporting/hooks/use-report-filters";
import { useReportQuery } from "@/features/reporting/hooks/use-report-query";

export function DashboardPage() {
  const { context, company } = useWorkspace();
  const { filters, error, change, origin } = useReportFilters();
  const showingResults = activeReportIndicators(filters).length > 0;
  const query = useReportQuery(
    "dashboard",
    filters,
    reportResultSchema,
    !error,
  );
  return (
    <div className="space-y-4">
      <PageHeading
        title="Inicio"
        description="El estado de tus empresas y el trabajo que necesita atención."
      />
      <DashboardShortcuts />
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
          {query.data && showingResults && (
            <div className="space-y-3">
              <ActiveReportIndicators filters={filters} mode="dashboard" />
              <Pagination
                count={query.data.count}
                onPage={(page) => change("page", String(page))}
                page={filters.page}
                pageSize={filters.pageSize}
              />
              <ReportTable rows={query.data.rows} origin={origin} />
            </div>
          )}
          {query.data && !showingResults && (
            <ReportMetrics
              filters={filters}
              metrics={query.data.metrics}
              mode="dashboard"
              reviewAllowed={canReviewScope(context, company)}
            />
          )}
        </QueryState>
      )}
      <ReportFilters
        busy={query.isFetching}
        filters={filters}
        onChange={change}
      />
      <FilterDisclosure label="Desglose por empresa y módulo">
        {query.data && <ReportGroups groups={query.data.groups} />}
      </FilterDisclosure>
    </div>
  );
}

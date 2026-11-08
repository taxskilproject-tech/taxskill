"use client";

import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { reportResultSchema } from "@/domain/reporting/contracts/reporting.schema";
import { activeReportIndicators } from "@/domain/reporting/utils/report-indicators";
import { PageHeading } from "@/features/access/components/page-heading";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { DashboardShortcuts } from "@/features/dashboard/components/dashboard-shortcuts";
import { ActiveReportIndicators } from "@/features/reporting/components/active-report-indicators";
import { CompanyFollowup } from "@/features/reporting/components/company-followup";
import { ReportFilters } from "@/features/reporting/components/report-filters";
import { ReportTable } from "@/features/reporting/components/report-table";
import { useReportFilters } from "@/features/reporting/hooks/use-report-filters";
import { useReportQuery } from "@/features/reporting/hooks/use-report-query";

export function DashboardPage() {
  const { filters, error, change, origin } = useReportFilters();
  const showingResults = activeReportIndicators(filters).length > 0;
  const query = useReportQuery(
    "dashboard",
    filters,
    reportResultSchema,
    !error && showingResults,
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
      ) : showingResults ? (
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
        </QueryState>
      ) : (
        <CompanyFollowup />
      )}
      {showingResults && (
        <ReportFilters
          busy={query.isFetching}
          filters={filters}
          onChange={change}
        />
      )}
    </div>
  );
}

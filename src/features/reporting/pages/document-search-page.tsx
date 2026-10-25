"use client";
import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { ResourceState } from "@/components/organisms/resource-state";
import { metadataResultSchema } from "@/domain/reporting/contracts/consultation.schema";
import { limaMoment } from "@/domain/reporting/utils/report-filters";
import { PageHeading } from "@/features/access/components/page-heading";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { MetadataRow } from "@/features/reporting/components/metadata-row";
import { ReportFilters } from "@/features/reporting/components/report-filters";
import { useReportFilters } from "@/features/reporting/hooks/use-report-filters";
import { useReportQuery } from "@/features/reporting/hooks/use-report-query";

export function DocumentSearchPage() {
  const { filters, error, change, reset, origin } = useReportFilters();
  const query = useReportQuery(
    "documents",
    filters,
    metadataResultSchema,
    !error,
  );
  return (
    <div className="space-y-3">
      <PageHeading
        description="Busca archivos entregados y sus versiones en tus empresas autorizadas."
        title="Documentos"
      />
      <ReportFilters
        busy={query.isFetching}
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
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">
                Consulta: {limaMoment(query.data.queried_at)} · Lima · Unidad:
                versiones de archivo.
              </p>
              <Pagination
                count={query.data.count}
                onPage={(page) => change("page", String(page))}
                page={filters.page}
                pageSize={filters.pageSize}
              />
              {query.data.rows.map((document) => (
                <MetadataRow
                  document={document}
                  key={document.id}
                  origin={origin}
                />
              ))}
              {query.data.count === 0 && (
                <ResourceState
                  description="Prueba otros filtros. La búsqueda consulta metadatos, sin leer el contenido de archivos."
                  kind="empty"
                  title="Sin documentos para estos filtros"
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

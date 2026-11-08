"use client";
import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { ResourceState } from "@/components/organisms/resource-state";
import { metadataResultSchema } from "@/domain/reporting/contracts/consultation.schema";
import { deliveryDetailsSchema } from "@/domain/reporting/contracts/followup.schema";
import { limaMoment } from "@/domain/reporting/utils/report-filters";
import { PageHeading } from "@/features/access/components/page-heading";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { DocumentFollowupControls } from "@/features/reporting/components/document-followup-controls";
import { MetadataRow } from "@/features/reporting/components/metadata-row";
import { PendingDocumentResults } from "@/features/reporting/components/pending-document-results";
import { ReportFilters } from "@/features/reporting/components/report-filters";
import { useReportFilters } from "@/features/reporting/hooks/use-report-filters";
import { useReportQuery } from "@/features/reporting/hooks/use-report-query";

export function DocumentSearchPage() {
  const { filters, error, change, reset, origin } = useReportFilters();
  const query = useReportQuery(
    "documents",
    filters,
    metadataResultSchema,
    !error && filters.document_view !== "pending",
  );
  const pending = useReportQuery(
    "pending_deliveries",
    filters,
    deliveryDetailsSchema,
    !error && filters.document_view === "pending",
  );
  return (
    <div className="space-y-2">
      <PageHeading
        description="Consulta los archivos subidos y las entregas pendientes por asistente."
        title="Documentos"
        action={
          <Button onClick={reset} variant="secondary">
            Limpiar filtros
          </Button>
        }
      />
      <DocumentFollowupControls
        filters={filters}
        onChange={change}
        onView={(view) => change("document_view", view)}
        onInvalidAssistant={() => change("assistant_id", "")}
      />
      <ReportFilters
        busy={query.isFetching || pending.isFetching}
        filters={filters}
        onChange={change}
      />
      {error ? (
        <FeedbackMessage kind="error">{error}</FeedbackMessage>
      ) : filters.document_view === "pending" ? (
        <PendingDocumentResults query={pending} />
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

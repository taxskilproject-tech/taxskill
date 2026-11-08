"use client";
import { ResourceState } from "@/components/organisms/resource-state";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";

import { useReportFilters } from "../hooks/use-report-filters";
import type { PendingDocumentResultsProps } from "../types/followup-ui.types";
import { DeliveryRows } from "./delivery-rows";

export function PendingDocumentResults({ query }: PendingDocumentResultsProps) {
  const { filters, change, origin } = useReportFilters();
  return (
    <QueryState
      loading={query.isPending}
      error={query.error}
      retrying={query.isFetching}
      onRetry={() => {
        void query.refetch();
      }}
    >
      {query.data && (
        <div className="space-y-2">
          <p className="text-xs text-slate-600">
            Archivos requeridos por subir o corregir.
          </p>
          <Pagination
            count={query.data.count}
            page={filters.page}
            pageSize={filters.pageSize}
            onPage={(page) => change("page", String(page))}
          />
          <DeliveryRows rows={query.data.rows} origin={origin} />
          {query.data.count === 0 && (
            <ResourceState
              kind="empty"
              title="Sin entregas pendientes"
              description="No hay archivos por subir o corregir para estos filtros."
            />
          )}
          {query.data.count > filters.pageSize && (
            <Pagination
              count={query.data.count}
              page={filters.page}
              pageSize={filters.pageSize}
              onPage={(page) => change("page", String(page))}
            />
          )}
        </div>
      )}
    </QueryState>
  );
}

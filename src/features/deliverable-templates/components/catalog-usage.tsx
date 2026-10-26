import Link from "next/link";
import { useState } from "react";

import { CheckboxField } from "@/components/molecules/checkbox-field";
import { catalogUsageSchema } from "@/domain/documents/contracts/template.schema";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import type { CatalogUsageProps } from "@/features/deliverable-templates/types/template-ui.types";
import { useDocumentQuery } from "@/features/documents/hooks/use-document-query";

export function CatalogUsage({ id }: CatalogUsageProps) {
  const [history, setHistory] = useState(false);
  const [page, setPage] = useState(1);
  const query = useDocumentQuery(
    "catalog_usage",
    { id, page, include_history: history },
    catalogUsageSchema,
  );
  return (
    <section className="mt-4 space-y-3">
      <h3 className="font-semibold">Empresas que utilizan este entregable</h3>
      <CheckboxField
        id={`usage-history-${id}`}
        label="Incluir uso histórico y empresas eliminadas"
        checked={history}
        onChange={(event) => {
          setHistory(event.target.checked);
          setPage(1);
        }}
      />
      <QueryState
        loading={query.isPending}
        error={query.error}
        retrying={query.isFetching}
        onRetry={() => {
          void query.refetch();
        }}
      >
        <p className="text-sm">
          {query.data?.active_companies ?? 0} activas ·{" "}
          {query.data?.pending_companies ?? 0} pendientes ·{" "}
          {query.data?.paused_companies ?? 0} pausadas
        </p>
        {query.data?.rows.map((row) => (
          <article
            key={row.company_id}
            className="space-y-1 border-b border-slate-200 py-2"
          >
            <Link
              href={`/configuracion?tab=reglas&rulesCompany=${row.company_id}`}
              className="inline-flex min-h-11 items-center text-sm font-medium text-blue-800 underline"
            >
              {row.company_name}
              {row.deleted_at ? " · Eliminada" : ""}
            </Link>
            <p className="text-xs text-slate-600">
              RUC {row.ruc} · {row.active_count} configuraciones activas ·{" "}
              {row.pending_count} pendientes · {row.paused_count} pausadas
            </p>
          </article>
        ))}
        {query.data?.count === 0 && (
          <p className="text-sm">
            Todavía no está asignado a una empresa en este alcance.
          </p>
        )}
        <Pagination
          count={query.data?.count ?? 0}
          page={page}
          onPage={setPage}
        />
      </QueryState>
    </section>
  );
}

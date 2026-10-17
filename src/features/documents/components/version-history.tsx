"use client";
import { useState } from "react";
import { z } from "zod";

import { versionSchema } from "@/domain/documents/contracts/document.schema";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { VersionRow } from "@/features/documents/components/version-row";
import { useDocumentQuery } from "@/features/documents/hooks/use-document-query";
import type { HistoryProps } from "@/features/documents/types/document-ui.types";

const historySchema = z.object({
  rows: z.array(versionSchema),
  count: z.number(),
});
export function VersionHistory({ obligationId, summary }: HistoryProps) {
  const [page, setPage] = useState(1);
  const query = useDocumentQuery(
    "history",
    { id: obligationId, page },
    historySchema,
  );
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">
        Historial de entregas y decisiones
      </h2>
      <QueryState
        error={query.error}
        loading={query.isPending}
        onRetry={() => {
          void query.refetch();
        }}
        retrying={query.isFetching}
      >
        <div className="space-y-4">
          {query.data?.rows.map((version) => (
            <VersionRow key={version.id} summary={summary} version={version} />
          ))}
          {query.data?.count === 0 && (
            <p className="text-sm text-zinc-600">
              Todavía no hay archivos validados. Una transferencia sin confirmar
              no cuenta como entrega.
            </p>
          )}
          <Pagination
            count={query.data?.count ?? 0}
            onPage={setPage}
            page={page}
          />
        </div>
      </QueryState>
    </section>
  );
}

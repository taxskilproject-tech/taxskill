import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { catalogRowSchema } from "@/domain/documents/contracts/document.schema";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import type { TemplateAddProps } from "@/features/deliverable-templates/types/template-ui.types";
import { CatalogSearch } from "@/features/documents/components/catalog-search";
import { useDocumentQuery } from "@/features/documents/hooks/use-document-query";

const listSchema = z.object({
  rows: z.array(catalogRowSchema),
  count: z.number(),
});
export function TemplateAdd({ items, busy, error, onAdd }: TemplateAddProps) {
  const [addingId, setAddingId] = useState<string | null>(null);
  const [q, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const query = useDocumentQuery(
    "catalog",
    { q, page, active: true },
    listSchema,
  );
  return (
    <div className="space-y-3">
      <p className="text-sm">
        Selecciona un tipo del catálogo. Se añadirá al final de su módulo;
        después configura frecuencia, plazo y archivos.
      </p>
      {error && <FeedbackMessage kind="error">{error}</FeedbackMessage>}
      <CatalogSearch
        busy={query.isFetching}
        onSearch={(value) => {
          setQuery(value);
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
        {query.data?.rows.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 border-b border-slate-100 py-2"
          >
            <span>{item.name}</span>
            <Button
              loading={busy && addingId === item.id}
              loadingText="Agregando entregable…"
              disabled={
                busy || items.some((current) => current.code === item.code)
              }
              onClick={() => {
                setAddingId(item.id);
                onAdd(item);
              }}
              variant="secondary"
            >
              {items.some((current) => current.code === item.code)
                ? "Ya incluido"
                : "Agregar"}
            </Button>
          </div>
        ))}
        <Pagination
          count={query.data?.count ?? 0}
          page={page}
          onPage={setPage}
        />
      </QueryState>
    </div>
  );
}

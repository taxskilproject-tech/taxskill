"use client";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/atoms/button";
import { CheckboxField } from "@/components/molecules/checkbox-field";
import { catalogRowSchema } from "@/domain/documents/contracts/document.schema";
import type { CatalogRow } from "@/domain/documents/types/document.types";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { CatalogForm } from "@/features/documents/components/catalog-form";
import { CatalogItem } from "@/features/documents/components/catalog-item";
import { ImportCatalogControl } from "@/features/documents/components/import-catalog-control";
import { useDocumentQuery } from "@/features/documents/hooks/use-document-query";

const catalogSchema = z.object({
  rows: z.array(catalogRowSchema),
  count: z.number(),
});
export function CatalogPanel() {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<CatalogRow>();
  const [deleted, setDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const query = useDocumentQuery(
    "catalog",
    { page, include_deleted: deleted },
    catalogSchema,
  );
  return (
    <section className="space-y-5">
      <ImportCatalogControl />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Catálogo documental</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Tipos disponibles para Tributario, Laboral general y las etapas de
            cada trabajador.
          </p>
        </div>
        <Button
          onClick={() => {
            setSelected(undefined);
            setEditing(true);
          }}
        >
          Nuevo tipo
        </Button>
      </div>
      <CheckboxField
        checked={deleted}
        id="catalog-deleted"
        label="Incluir tipos eliminados"
        onChange={(event) => {
          setDeleted(event.target.checked);
          setPage(1);
        }}
      />
      {editing && (
        <CatalogForm
          item={selected}
          key={selected?.id ?? "new"}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      )}
      <QueryState
        error={query.error}
        loading={query.isPending}
        onRetry={() => {
          void query.refetch();
        }}
        retrying={query.isFetching}
      >
        <div className="space-y-4">
          {query.data?.rows.map((item) => (
            <CatalogItem
              item={item}
              key={item.id}
              onEdit={() => {
                setSelected(item);
                setEditing(true);
              }}
            />
          ))}
          {query.data?.count === 0 && (
            <p className="text-sm text-zinc-600">
              Crea el primer tipo para configurar sus reglas y periodicidades.
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

"use client";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/atoms/button";
import { SidePanel } from "@/components/organisms/side-panel";
import { catalogRowSchema } from "@/domain/documents/contracts/document.schema";
import type { CatalogRow } from "@/domain/documents/types/document.types";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { CatalogForm } from "@/features/documents/components/catalog-form";
import { CatalogItem } from "@/features/documents/components/catalog-item";
import { ConfigurationFilters } from "@/features/documents/components/configuration-filters";
import { ImportCatalogControl } from "@/features/documents/components/import-catalog-control";
import { useConfigurationFilters } from "@/features/documents/hooks/use-configuration-filters";
import { useDocumentQuery } from "@/features/documents/hooks/use-document-query";

const catalogSchema = z.object({
  rows: z.array(catalogRowSchema),
  count: z.number(),
});
export function CatalogPanel() {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<CatalogRow>();
  const filters = useConfigurationFilters("catalog");
  const { page, setPage } = filters;
  const query = useDocumentQuery("catalog", filters.input, catalogSchema);
  return (
    <section className="space-y-2">
      {query.data?.count === 0 && !filters.query && !filters.module && (
        <ImportCatalogControl />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Catálogo de entregables</h2>
          <p className="sr-only">
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
      <ConfigurationFilters
        filters={filters}
        resource="catalog"
        busy={query.isFetching}
      />
      {editing && (
        <SidePanel
          title={
            selected ? "Editar tipo de entregable" : "Nuevo tipo de entregable"
          }
          onClose={() => setEditing(false)}
        >
          <CatalogForm
            item={selected}
            key={selected?.id ?? "new"}
            onCancel={() => setEditing(false)}
            onSaved={() => setEditing(false)}
          />
        </SidePanel>
      )}
      <QueryState
        error={query.error}
        loading={query.isPending}
        onRetry={() => {
          void query.refetch();
        }}
        retrying={query.isFetching}
      >
        <div className="space-y-1">
          <Pagination
            count={query.data?.count ?? 0}
            onPage={setPage}
            page={page}
          />
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
              Crea el primer tipo para configurar sus entregables y
              periodicidades.
            </p>
          )}
          <Pagination
            count={query.data?.count ?? 0}
            onPage={setPage}
            page={page}
          />
        </div>
      </QueryState>
      <details>
        <summary className="min-h-11 cursor-pointer py-3 text-sm text-blue-800">
          Importar tipos del catálogo inicial
        </summary>
        <ImportCatalogControl />
      </details>
    </section>
  );
}

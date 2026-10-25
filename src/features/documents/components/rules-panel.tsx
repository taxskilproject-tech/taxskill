"use client";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/atoms/button";
import { SidePanel } from "@/components/organisms/side-panel";
import { ruleRowSchema } from "@/domain/documents/contracts/document.schema";
import type { RuleRow } from "@/domain/documents/types/document.types";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { ConfigurationFilters } from "@/features/documents/components/configuration-filters";
import { RuleForm } from "@/features/documents/components/rule-form";
import { RuleItem } from "@/features/documents/components/rule-item";
import { useConfigurationFilters } from "@/features/documents/hooks/use-configuration-filters";
import { useDocumentQuery } from "@/features/documents/hooks/use-document-query";

const rulesSchema = z.object({
  rows: z.array(ruleRowSchema),
  count: z.number(),
});
export function RulesPanel() {
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<RuleRow>();
  const filters = useConfigurationFilters("rules");
  const { page, setPage } = filters;
  const query = useDocumentQuery("rules", filters.input, rulesSchema);
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Reglas documentales</h2>
          <p className="sr-only">
            Periodicidades, versiones, pausas y avance del generador común. Las
            condiciones históricas se conservan.
          </p>
        </div>
        <Button
          onClick={() => {
            setSelected(undefined);
            setCreating(true);
          }}
        >
          Nueva regla
        </Button>
      </div>
      {creating && (
        <SidePanel
          title={selected ? "Nueva versión de regla" : "Nueva regla"}
          onClose={() => setCreating(false)}
          wide
        >
          <RuleForm
            key={selected?.id ?? "new"}
            onSaved={() => setCreating(false)}
            rule={selected}
          />
        </SidePanel>
      )}
      <ConfigurationFilters
        filters={filters}
        resource="rules"
        busy={query.isFetching}
      />
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
          {query.data?.rows.map((rule) => (
            <RuleItem
              key={rule.id}
              onEdit={() => {
                setSelected(rule);
                setCreating(true);
              }}
              rule={rule}
            />
          ))}
          {query.data?.count === 0 && (
            <p className="text-sm text-zinc-600">
              Configura una regla para iniciar el primer recorrido.
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

"use client";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/atoms/button";
import { CheckboxField } from "@/components/molecules/checkbox-field";
import { SidePanel } from "@/components/organisms/side-panel";
import { ruleRowSchema } from "@/domain/documents/contracts/document.schema";
import type { RuleRow } from "@/domain/documents/types/document.types";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { RuleForm } from "@/features/documents/components/rule-form";
import { RuleItem } from "@/features/documents/components/rule-item";
import { useDocumentQuery } from "@/features/documents/hooks/use-document-query";

const rulesSchema = z.object({
  rows: z.array(ruleRowSchema),
  count: z.number(),
});
export function RulesPanel() {
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<RuleRow>();
  const [deleted, setDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const query = useDocumentQuery(
    "rules",
    { page, include_deleted: deleted },
    rulesSchema,
  );
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Reglas documentales</h2>
          <p className="mt-2 text-sm text-zinc-600">
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
      <CheckboxField
        checked={deleted}
        id="rules-deleted"
        label="Incluir reglas eliminadas"
        onChange={(event) => {
          setDeleted(event.target.checked);
          setPage(1);
        }}
      />
      <QueryState
        error={query.error}
        loading={query.isPending}
        onRetry={() => {
          void query.refetch();
        }}
        retrying={query.isFetching}
      >
        <div className="space-y-4">
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

"use client";
import { useState } from "react";

import { CheckboxField } from "@/components/molecules/checkbox-field";
import { additionalRulesSchema } from "@/domain/activities/contracts/activity.schema";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { AdditionalRuleCard } from "@/features/activities/components/additional-rule-card";
import { useActivityQuery } from "@/features/activities/hooks/use-activity-query";
import type { ActivityInboxProps } from "@/features/activities/types/activity-ui.types";
import { useWorkspace } from "@/features/auth/providers/workspace-context";

export function AdditionalRulesPanel({ companyId }: ActivityInboxProps) {
  const [page, setPage] = useState(1);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const { company } = useWorkspace();
  const query = useActivityQuery(
    "additional_rules",
    {
      company_id: companyId,
      page,
      include_deleted: includeDeleted,
      scope: !companyId && company.kind === "internal" ? "internal" : "all",
    },
    additionalRulesSchema,
  );
  return (
    <details className="rounded-xl border border-zinc-200 bg-white p-5">
      <summary className="cursor-pointer font-medium">
        Reglas de actividades recurrentes
      </summary>
      <div className="mt-4 space-y-4">
        <CheckboxField
          checked={includeDeleted}
          id="additional-rules-deleted"
          label="Incluir reglas eliminadas"
          onChange={(event) => {
            setIncludeDeleted(event.target.checked);
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
          {query.data?.rows.map((rule) => (
            <AdditionalRuleCard
              key={`${rule.id}:${rule.revision}`}
              rule={rule}
            />
          ))}
          {query.data?.count === 0 && (
            <p className="text-sm text-zinc-600">
              Aún no hay actividades recurrentes configuradas.
            </p>
          )}
          <Pagination
            count={query.data?.count ?? 0}
            onPage={setPage}
            page={page}
          />
        </QueryState>
      </div>
    </details>
  );
}

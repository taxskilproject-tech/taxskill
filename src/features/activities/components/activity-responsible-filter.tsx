"use client";
import { useState } from "react";

import { SelectField } from "@/components/molecules/select-field";
import { activityRecipientsSchema } from "@/domain/activities/contracts/activity.schema";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { useActivityQuery } from "@/features/activities/hooks/use-activity-query";
import type { ActivityFiltersProps } from "@/features/activities/types/activity-ui.types";

export function ActivityResponsibleFilter({
  filters,
  onChange,
}: ActivityFiltersProps) {
  const [page, setPage] = useState(1);
  const query = useActivityQuery(
    "activity_responsibles",
    { company_id: filters.companyId, scope: filters.scope, page },
    activityRecipientsSchema,
  );
  return (
    <QueryState
      error={query.error}
      loading={query.isPending}
      onRetry={() => {
        void query.refetch();
      }}
      retrying={query.isFetching}
    >
      <div className="space-y-3">
        <SelectField
          id="activities-responsible"
          label="Responsable de entrega"
          onChange={(event) => onChange("responsibleId", event.target.value)}
          value={filters.responsibleId ?? ""}
        >
          <option value="">Todos los responsables</option>
          {filters.responsibleId &&
            !query.data?.rows.some(
              (row) => row.user_id === filters.responsibleId,
            ) && (
              <option value={filters.responsibleId}>
                Responsable seleccionado
              </option>
            )}
          {query.data?.rows.map((row) => (
            <option key={row.user_id} value={row.user_id}>
              {row.full_name}
            </option>
          ))}
        </SelectField>
        {(query.data?.count ?? 0) > 25 && (
          <Pagination
            count={query.data?.count ?? 0}
            onPage={setPage}
            page={page}
          />
        )}
      </div>
    </QueryState>
  );
}

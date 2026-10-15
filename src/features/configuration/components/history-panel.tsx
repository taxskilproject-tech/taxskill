"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { SelectField } from "@/components/molecules/select-field";
import { SOFT_DELETE_ENTITIES } from "@/domain/access/constants/access";
import type { SoftDeleteEntity } from "@/domain/access/types/access.types";
import { LifecycleControl } from "@/features/access/components/lifecycle-control";
import { QueryState } from "@/features/access/components/query-state";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { listDeleted } from "@/features/configuration/repositories/history.repository";
import { useDataScope } from "@/lib/query/hooks/use-data-scope";
import { createScopedQueryKey } from "@/lib/query/utils/query-keys";

export function HistoryPanel() {
  const { context } = useWorkspace();
  const scope = useDataScope();
  const [entity, setEntity] = useState<SoftDeleteEntity>("companies");
  const history = useQuery({
    queryKey: createScopedQueryKey(scope!, "deleted", { entity }),
    queryFn: ({ signal }) =>
      listDeleted(context.organization.id, entity, signal),
  });
  function selectEntity(value: string) {
    const found = SOFT_DELETE_ENTITIES.find((item) => item === value);
    if (found) setEntity(found);
  }
  return (
    <section className="space-y-5 rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Restauración administrativa</h2>
      <p className="text-sm text-zinc-500">
        Conserva estados e historial. Requiere padres disponibles y no restaura
        hijos por separado. Se muestran los 100 registros más recientes.
      </p>
      <SelectField
        id="history-entity"
        label="Tipo de registro"
        onChange={(event) => selectEntity(event.target.value)}
        value={entity}
      >
        {SOFT_DELETE_ENTITIES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </SelectField>
      <QueryState
        error={history.error}
        loading={history.isPending}
        onRetry={() => {
          void history.refetch();
        }}
        retrying={history.isFetching}
      >
        <ul className="space-y-3">
          {history.data?.map((row) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-4"
              key={row.id}
            >
              <div>
                <p className="text-sm font-medium break-all">{row.label}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {row.reason} · {row.deletedAt.slice(0, 10)}
                </p>
              </div>
              <LifecycleControl
                deleted
                entity={entity}
                id={row.id}
                onChanged={() => {
                  void history.refetch();
                }}
                revision={row.revision}
              />
            </li>
          ))}
        </ul>
        {!history.data?.length && (
          <p className="text-sm text-zinc-500">Sin eliminados de este tipo.</p>
        )}
      </QueryState>
    </section>
  );
}

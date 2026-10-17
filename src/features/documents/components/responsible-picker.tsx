"use client";
import { useState } from "react";

import { SelectField } from "@/components/molecules/select-field";
import { responsibleListSchema } from "@/domain/documents/contracts/engine.schema";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { useActivityQuery } from "@/features/activities/hooks/use-activity-query";
import { useDocumentQuery } from "@/features/documents/hooks/use-document-query";
import type { ResponsiblePickerProps } from "@/features/documents/types/engine-ui.types";

export function ResponsiblePicker({
  companyId,
  module,
  selected,
  name = "delivery_responsible_id",
  disabled,
}: ResponsiblePickerProps) {
  const [page, setPage] = useState(1);
  const [value, setValue] = useState(selected ?? "");
  const documentary = useDocumentQuery(
    "responsibles",
    { company_id: companyId ?? undefined, module, page },
    responsibleListSchema,
    Boolean(companyId) && module !== "actividades",
  );
  const additional = useActivityQuery(
    "recipients",
    { company_id: companyId, page },
    responsibleListSchema,
    module === "actividades",
  );
  const query = module === "actividades" ? additional : documentary;
  if (!companyId && module !== "actividades")
    return (
      <p className="text-sm text-zinc-600">Selecciona primero una empresa.</p>
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
      <SelectField
        disabled={disabled || query.isPending}
        id={`${name}-${companyId}`}
        label="Responsable con permiso de entrega"
        name={name}
        onChange={(event) => setValue(event.target.value)}
        required
        value={value}
      >
        <option value="">Seleccionar responsable elegible</option>
        {value && !query.data?.rows.some((row) => row.user_id === value) && (
          <option value={value}>
            Responsable seleccionado · comprobar elegibilidad al guardar
          </option>
        )}
        {query.data?.rows.map((row) => (
          <option key={row.user_id} value={row.user_id}>
            {row.full_name}
          </option>
        ))}
      </SelectField>
      <Pagination count={query.data?.count ?? 0} onPage={setPage} page={page} />
      {!query.data?.count && module === "actividades" && (
        <p className="text-sm text-zinc-600">
          Asigna primero permiso de entrega en Actividades para este alcance.
        </p>
      )}
    </QueryState>
  );
}

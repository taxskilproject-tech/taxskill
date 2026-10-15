import { useId } from "react";

import { CheckboxField } from "@/components/molecules/checkbox-field";
import { FormField } from "@/components/molecules/form-field";
import type { ListToolbarProps } from "@/features/access/types/access-ui.types";

export function ListToolbar({
  query,
  deleted,
  onQuery,
  onDeleted,
  allowDeleted,
}: ListToolbarProps) {
  const id = useId();
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="w-full max-w-sm">
        <FormField
          id={id + "-search"}
          label="Buscar por nombre"
          onChange={(event) => onQuery(event.target.value)}
          type="search"
          value={query}
        />
      </div>
      {allowDeleted && (
        <CheckboxField
          checked={deleted}
          id={id + "-deleted"}
          label="Consultar eliminados"
          onChange={(event) => onDeleted(event.target.checked)}
        />
      )}
    </div>
  );
}

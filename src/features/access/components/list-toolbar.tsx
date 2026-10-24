import { useId } from "react";

import { Input } from "@/components/atoms/input";
import { CheckboxField } from "@/components/molecules/checkbox-field";
import { FilterDisclosure } from "@/components/molecules/filter-disclosure";
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
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 has-[details[open]]:grid-cols-1">
      <div>
        <label className="sr-only" htmlFor={id + "-search"}>
          Buscar por nombre
        </label>
        <Input
          id={id + "-search"}
          placeholder="Buscar por nombre…"
          onChange={(event) => onQuery(event.target.value)}
          type="search"
          value={query}
        />
      </div>
      {allowDeleted && (
        <FilterDisclosure label="Histórico" count={Number(deleted)}>
          <CheckboxField
            checked={deleted}
            id={id + "-deleted"}
            label="Consultar eliminados"
            onChange={(event) => onDeleted(event.target.checked)}
          />
        </FilterDisclosure>
      )}
    </div>
  );
}

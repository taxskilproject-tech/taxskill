import { Input } from "@/components/atoms/input";
import { CheckboxField } from "@/components/molecules/checkbox-field";
import { FilterDisclosure } from "@/components/molecules/filter-disclosure";
import { SelectField } from "@/components/molecules/select-field";
import type { WorkerFiltersProps } from "@/features/workers/types/worker-ui.types";

export function WorkerFilters({
  search,
  onSearch,
  status,
  onStatus,
  deleted,
  onDeleted,
  isAdmin,
}: WorkerFiltersProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 has-[details[open]]:grid-cols-1">
      <div>
        <label className="sr-only" htmlFor="workers-search">
          Buscar por nombre o identificación
        </label>
        <Input
          id="workers-search"
          maxLength={150}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar trabajador…"
          type="search"
          value={search}
        />
      </div>
      <FilterDisclosure
        label="Filtros"
        count={Number(status !== "all") + Number(deleted)}
      >
        <SelectField
          id="workers-status"
          label="Relación laboral"
          onChange={(event) => onStatus(event.target.value)}
          value={status}
        >
          <option value="all">Todas</option>
          <option value="active">Con etapa activa</option>
          <option value="ended">Con etapas cerradas</option>
          <option value="unregistered">Sin etapa registrada</option>
        </SelectField>
        {isAdmin && (
          <CheckboxField
            checked={deleted}
            id="workers-deleted"
            label="Incluir trabajadores eliminados"
            onChange={(event) => onDeleted(event.target.checked)}
          />
        )}
      </FilterDisclosure>
    </div>
  );
}

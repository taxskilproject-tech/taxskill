import { CheckboxField } from "@/components/molecules/checkbox-field";
import { FormField } from "@/components/molecules/form-field";
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
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="workers-search"
          label="Buscar por nombre o identificación"
          maxLength={150}
          onChange={(event) => onSearch(event.target.value)}
          type="search"
          value={search}
        />
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
      </div>
      {isAdmin && (
        <CheckboxField
          checked={deleted}
          id="workers-deleted"
          label="Incluir trabajadores eliminados"
          onChange={(event) => onDeleted(event.target.checked)}
        />
      )}
    </div>
  );
}

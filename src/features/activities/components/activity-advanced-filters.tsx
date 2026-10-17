import { FormField } from "@/components/molecules/form-field";
import { SelectField } from "@/components/molecules/select-field";
import { REVIEW_LABELS } from "@/domain/documents/constants/documents";
import type { ActivityFiltersProps } from "@/features/activities/types/activity-ui.types";

export function ActivityAdvancedFilters({
  filters,
  onChange,
}: ActivityFiltersProps) {
  return (
    <details className="rounded-xl border border-zinc-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-medium">
        Más filtros y orden
      </summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SelectField
          id="activities-class"
          label="Clase"
          onChange={(event) => onChange("class", event.target.value)}
          value={filters.class ?? ""}
        >
          <option value="">Documentales y adicionales</option>
          <option value="documentary">Documentales</option>
          <option value="additional">Adicionales</option>
        </SelectField>
        <SelectField
          id="activities-priority"
          label="Prioridad"
          onChange={(event) => onChange("priority", event.target.value)}
          value={filters.priority ?? ""}
        >
          <option value="">Todas las prioridades</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </SelectField>
        <SelectField
          id="activities-state"
          label="Estado documental"
          onChange={(event) => onChange("state", event.target.value)}
          value={filters.state ?? ""}
        >
          <option value="">Todos</option>
          {Object.entries(REVIEW_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <FormField
          id="activities-period"
          label="Periodo (clave exacta)"
          maxLength={150}
          onChange={(event) => onChange("period", event.target.value)}
          value={filters.period ?? ""}
        />
        <FormField
          id="activities-from"
          label="Entrega desde"
          onChange={(event) => onChange("dueFrom", event.target.value)}
          type="date"
          value={filters.dueFrom ?? ""}
        />
        <FormField
          id="activities-to"
          label="Entrega hasta"
          onChange={(event) => onChange("dueTo", event.target.value)}
          type="date"
          value={filters.dueTo ?? ""}
        />
        <SelectField
          id="activities-sort"
          label="Ordenar por"
          onChange={(event) => onChange("sort", event.target.value)}
          value={filters.sort}
        >
          <option value="urgency">Urgencia</option>
          <option value="priority">Prioridad</option>
          <option value="due_date">Fecha de entrega</option>
          <option value="received_at">Recepción más antigua</option>
        </SelectField>
        <SelectField
          id="activities-size"
          label="Actividades por página"
          onChange={(event) => onChange("pageSize", event.target.value)}
          value={filters.pageSize}
        >
          <option>25</option>
          <option>50</option>
          <option>100</option>
        </SelectField>
      </div>
    </details>
  );
}

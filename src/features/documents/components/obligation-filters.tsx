import { FormField } from "@/components/molecules/form-field";
import { SelectField } from "@/components/molecules/select-field";
import type { ObligationFiltersProps } from "@/features/documents/types/document-ui.types";

export function ObligationFilters({
  period,
  state,
  onPeriod,
  onState,
}: ObligationFiltersProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        hint="Clave exacta, por ejemplo 2026-10 o 2026-W42. Vacío muestra todos."
        id="obligation-period"
        label="Filtrar periodo"
        maxLength={150}
        onChange={(event) => onPeriod(event.target.value)}
        value={period}
      />
      <SelectField
        id="obligation-state"
        label="Estado documental"
        onChange={(event) => onState(event.target.value)}
        value={state}
      >
        <option value="">Todos</option>
        <option value="pendiente">Pendiente de entrega</option>
        <option value="por_revisar">Por revisar</option>
        <option value="observado">Observado</option>
        <option value="aprobado">Aprobado</option>
        <option value="no_aplica">No aplica</option>
        <option value="cancelled">Cancelado</option>
      </SelectField>
    </div>
  );
}

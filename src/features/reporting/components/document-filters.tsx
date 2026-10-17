import { FormField } from "@/components/molecules/form-field";
import { SelectField } from "@/components/molecules/select-field";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import type { ReportFilterProps } from "@/features/reporting/types/reporting-ui.types";

export function DocumentFilters({ filters, onChange }: ReportFilterProps) {
  const { context, company } = useWorkspace();
  return (
    <>
      <SelectField
        id="report-state"
        label="Estado documental"
        onChange={(e) => onChange("state", e.target.value)}
        value={filters.state ?? ""}
      >
        <option value="">Todos los estados</option>
        <option value="pendiente">Pendiente</option>
        <option value="por_revisar">Por revisar</option>
        <option value="observado">Observado</option>
        <option value="aprobado">Aprobado</option>
        <option value="no_aplica">No aplica</option>
        <option value="cancelled">Cancelado</option>
      </SelectField>
      <SelectField
        id="report-class"
        label="Clase"
        onChange={(e) => onChange("class", e.target.value)}
        value={filters.class ?? ""}
      >
        <option value="">Documentales y adicionales</option>
        <option value="documentary">Documentales</option>
        <option value="additional">Adicionales</option>
      </SelectField>
      <SelectField
        disabled={company.kind !== "all"}
        id="report-scope"
        label="Alcance"
        onChange={(e) => onChange("scope", e.target.value)}
        value={filters.scope}
      >
        <option value="all">Todo el alcance autorizado</option>
        <option value="company">Empresas</option>
        {context.member.member_type === "internal" && (
          <option value="internal">Internas del estudio</option>
        )}
      </SelectField>
      <FormField
        id="report-year"
        label="Año de inicio del periodo"
        max={9999}
        min={1900}
        onBlur={(e) => onChange("year", e.target.value)}
        type="number"
        defaultValue={filters.year ?? ""}
        key={filters.year}
      />
      <FormField
        id="report-month"
        label="Mes de inicio del periodo"
        max={12}
        min={1}
        onBlur={(e) => onChange("month", e.target.value)}
        type="number"
        defaultValue={filters.month ?? ""}
        key={filters.month}
      />
      <FormField
        id="report-due-from"
        label="Entrega pendiente desde"
        onChange={(e) => onChange("due_from", e.target.value)}
        type="date"
        value={filters.due_from ?? ""}
      />
      <FormField
        id="report-due-to"
        label="Entrega pendiente hasta"
        onChange={(e) => onChange("due_to", e.target.value)}
        type="date"
        value={filters.due_to ?? ""}
      />
      <SelectField
        id="report-sort"
        label="Orden"
        onChange={(e) => onChange("sort", e.target.value)}
        value={filters.sort}
      >
        <option value="due">Plazo de entrega</option>
        <option value="title">Título</option>
        <option value="period">Periodo reciente</option>
      </SelectField>
    </>
  );
}

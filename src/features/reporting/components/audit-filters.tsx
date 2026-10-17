import { FormField } from "@/components/molecules/form-field";
import type { ReportFilterProps } from "@/features/reporting/types/reporting-ui.types";

export function AuditFilters({ filters, onChange }: ReportFilterProps) {
  return (
    <>
      <FormField
        id="audit-actor"
        label="Actor (UUID de usuario)"
        onBlur={(e) => onChange("actor_id", e.target.value)}
        defaultValue={filters.actor_id ?? ""}
        key={filters.actor_id}
      />
      <FormField
        id="audit-resource"
        label="Recurso (tabla)"
        onChange={(e) => onChange("resource", e.target.value)}
        value={filters.resource ?? ""}
      />
      <FormField
        id="audit-action"
        label="Acción"
        onChange={(e) => onChange("action", e.target.value)}
        value={filters.action ?? ""}
      />
      <FormField
        id="audit-from"
        label="Desde (Lima)"
        onChange={(e) => onChange("from", e.target.value)}
        type="date"
        value={filters.from ?? ""}
      />
      <FormField
        id="audit-to"
        label="Hasta (Lima, inclusive)"
        onChange={(e) => onChange("to", e.target.value)}
        type="date"
        value={filters.to ?? ""}
      />
    </>
  );
}

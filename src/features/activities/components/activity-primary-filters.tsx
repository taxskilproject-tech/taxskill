"use client";
import { FormField } from "@/components/molecules/form-field";
import { SelectField } from "@/components/molecules/select-field";
import { DOCUMENT_MODULES } from "@/domain/common/constants/modules";
import type { ActivityFiltersProps } from "@/features/activities/types/activity-ui.types";
import { useWorkspace } from "@/features/auth/providers/workspace-context";

export function ActivityPrimaryFilters({
  filters,
  onChange,
  lockedCompany,
}: ActivityFiltersProps) {
  const { context } = useWorkspace();
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <FormField
        id="activities-search"
        label="Buscar en actividades"
        maxLength={150}
        onChange={(event) => onChange("q", event.target.value)}
        type="search"
        value={filters.q ?? ""}
      />
      <SelectField
        disabled={lockedCompany}
        id="activities-company"
        label="Empresa o alcance"
        onChange={(event) => {
          onChange("companyId", event.target.value);
        }}
        value={filters.companyId ?? ""}
      >
        <option value="">Todas mis empresas y alcances</option>
        {context.companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.legal_name}
          </option>
        ))}
      </SelectField>
      <SelectField
        disabled={lockedCompany || Boolean(filters.companyId)}
        id="activities-scope"
        label="Tipo de alcance"
        onChange={(event) => onChange("scope", event.target.value)}
        value={filters.scope}
      >
        <option value="all">Todos los alcances</option>
        <option value="company">Solo empresas</option>
        {context.member.member_type === "internal" && (
          <option value="internal">Internas del estudio</option>
        )}
      </SelectField>
      <SelectField
        id="activities-module"
        label="Área"
        onChange={(event) => onChange("module", event.target.value)}
        value={filters.module ?? ""}
      >
        <option value="">Todas las áreas</option>
        {DOCUMENT_MODULES.map((module) => (
          <option key={module.id} value={module.id}>
            {module.name}
          </option>
        ))}
      </SelectField>
    </div>
  );
}

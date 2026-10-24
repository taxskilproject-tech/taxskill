"use client";
import { FormField } from "@/components/molecules/form-field";
import { SelectField } from "@/components/molecules/select-field";
import type { AdditionalFieldsProps } from "@/features/activities/types/activity-ui.types";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { FileSizeField } from "@/features/documents/components/file-size-field";

export function AdditionalFields({
  companyId,
  fixedCompany,
  maximum,
  rule,
  onCompany,
  onMaximum,
}: AdditionalFieldsProps) {
  const { context } = useWorkspace();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        defaultValue={rule?.title}
        id="additional-title"
        label="Título de la actividad"
        maxLength={150}
        minLength={2}
        name="title"
        required
      />
      <div>
        <SelectField
          disabled={Boolean(fixedCompany) || Boolean(rule)}
          id="additional-company"
          label="Alcance de la actividad"
          onChange={(event) => onCompany(event.target.value)}
          value={companyId}
        >
          <option value="">Interna del estudio</option>
          {context.companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.legal_name}
            </option>
          ))}
        </SelectField>
        <input name="company_id" type="hidden" value={companyId} />
      </div>
      <FormField
        defaultValue={rule?.description ?? ""}
        id="additional-description"
        label="Descripción (opcional)"
        maxLength={1000}
        name="description"
      />
      <SelectField
        defaultValue={rule?.configuration.priority ?? "media"}
        id="additional-priority"
        label="Prioridad"
        name="priority"
      >
        <option value="alta">Alta</option>
        <option value="media">Media</option>
        <option value="baja">Baja</option>
      </SelectField>
      <FileSizeField
        id="additional-maximum"
        label="Límite general por archivo"
        maximum={50000000}
        name="max_file_bytes"
        onChange={onMaximum}
        value={maximum}
      />
    </div>
  );
}

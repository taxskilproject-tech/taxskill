import { CheckboxField } from "@/components/molecules/checkbox-field";
import { FormField } from "@/components/molecules/form-field";
import { SelectField } from "@/components/molecules/select-field";
import { MAX_CONFIGURED_FILE_BYTES } from "@/domain/documents/constants/engine";
import { FileSizeField } from "@/features/documents/components/file-size-field";
import { RuleStartFields } from "@/features/documents/components/rule-start-fields";
import type { RuleMetadataProps } from "@/features/documents/types/engine-ui.types";

export function RuleMetadataFields({
  rule,
  maximum,
  onMaximum,
  companyId,
}: RuleMetadataProps) {
  return (
    <fieldset className="space-y-4">
      <FormField
        defaultValue={rule?.title}
        id="rule-title"
        label="Nombre del entregable"
        maxLength={150}
        name="title"
        required
      />
      <FormField
        defaultValue={rule?.description ?? ""}
        id="rule-description"
        label="Descripción"
        maxLength={1000}
        name="description"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          defaultValue={rule?.configuration.priority ?? "media"}
          id="rule-priority"
          label="Prioridad"
          name="priority"
        >
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </SelectField>
        <FileSizeField
          id="rule-maximum"
          label="Límite general por archivo"
          maximum={MAX_CONFIGURED_FILE_BYTES}
          name="max_file_bytes"
          onChange={onMaximum}
          value={maximum}
        />
      </div>
      <RuleStartFields rule={rule} companyId={companyId} />
      <CheckboxField
        defaultChecked={rule?.configuration.is_required ?? true}
        id="rule-required"
        label="Obligación exigible para cumplimiento"
        name="is_required"
      />
      <CheckboxField
        defaultChecked={rule?.active ?? false}
        id="rule-active"
        label="Entregable activo: validar responsable y habilitar generación"
        name="active"
      />
      <p className="text-sm text-zinc-600">
        Un entregable guardado inactivo es un borrador. Las obligaciones
        emitidas conservan sus condiciones aunque edites o pauses el entregable.
      </p>
    </fieldset>
  );
}

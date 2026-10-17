import { FormField } from "@/components/molecules/form-field";
import { SelectField } from "@/components/molecules/select-field";
import {
  TERMINATION_LABELS,
  TERMINATION_REASONS,
} from "@/domain/workers/constants/workers";
import type { EndFieldsProps } from "@/features/workers/types/worker-ui.types";

export function EndFields({ stage }: EndFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          defaultValue={stage?.end_date ?? ""}
          id="employment-end"
          label="Fecha de cese"
          name="end_date"
          required
          type="date"
        />
        <SelectField
          defaultValue={stage?.termination_reason ?? ""}
          id="employment-reason"
          label="Motivo de cese"
          name="termination_reason"
          required
        >
          <option value="">Seleccionar motivo</option>
          {TERMINATION_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {TERMINATION_LABELS[reason]}
            </option>
          ))}
        </SelectField>
      </div>
      <FormField
        defaultValue={stage?.termination_notes ?? ""}
        hint="Obligatorio cuando el motivo es Otro."
        id="employment-end-notes"
        label="Observación de cese"
        maxLength={1000}
        name="termination_notes"
      />
    </div>
  );
}

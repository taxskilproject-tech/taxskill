"use client";
import { FormField } from "@/components/molecules/form-field";
import { SelectField } from "@/components/molecules/select-field";
import {
  FREQUENCIES,
  FREQUENCY_LABELS,
} from "@/domain/documents/constants/engine";
import { DeadlineFields } from "@/features/documents/components/deadline-fields";
import type { RecurrenceFieldsProps } from "@/features/documents/types/engine-ui.types";

export function RecurrenceFields({
  frequency,
  onFrequency,
  configuration,
  allowEventual = true,
  allowIncomplete = false,
}: RecurrenceFieldsProps) {
  const frequencies = allowEventual
    ? FREQUENCIES
    : FREQUENCIES.filter((item) => item !== "eventual");
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold">Frecuencia y plazo</legend>
      <SelectField
        id="rule-frequency"
        label="Periodicidad"
        name="frequency"
        onChange={(event) => {
          const selected = FREQUENCIES.find(
            (item) => item === event.target.value,
          );
          if (selected) onFrequency(selected);
        }}
        value={frequency ?? ""}
      >
        {frequency === null && (
          <option value="">Seleccionar periodicidad</option>
        )}
        {frequencies.map((item) => (
          <option key={item} value={item}>
            {FREQUENCY_LABELS[item]}
          </option>
        ))}
      </SelectField>
      <div className="grid gap-4 sm:grid-cols-2" key={frequency}>
        {frequency === "personalizada" && (
          <>
            <FormField
              defaultValue={configuration?.interval_count ?? 1}
              id="rule-interval"
              label="Cada cuántas unidades"
              max={1200}
              min={1}
              name="interval_count"
              required
              type="number"
            />
            <SelectField
              defaultValue={configuration?.interval_unit ?? "months"}
              id="rule-unit"
              label="Unidad del intervalo"
              name="interval_unit"
            >
              <option value="days">Días</option>
              <option value="weeks">Semanas</option>
              <option value="months">Meses</option>
            </SelectField>
          </>
        )}
        {(frequency === "unica" || frequency === "personalizada") && (
          <FormField
            defaultValue={configuration?.anchor_date ?? ""}
            id="rule-anchor"
            label={
              frequency === "unica" ? "Fecha límite explícita" : "Fecha ancla"
            }
            name="anchor_date"
            required
            type="date"
          />
        )}
        {frequency === "unica" ? (
          <input name="deadline_offset_days" type="hidden" value="0" />
        ) : (
          <DeadlineFields
            initial={configuration ? configuration.deadline_offset_days : 0}
            eventual={frequency === "eventual"}
            allowIncomplete={allowIncomplete}
          />
        )}
      </div>
      <p className="text-sm text-zinc-600">
        Fechas de Lima. No se trasladan vencimientos por fines de semana ni
        feriados.
      </p>
      {frequency === "personalizada" && (
        <p className="text-sm text-zinc-600">
          Los intervalos mensuales conservan el día del ancla y lo recuperan
          después de un mes corto.
        </p>
      )}
    </fieldset>
  );
}

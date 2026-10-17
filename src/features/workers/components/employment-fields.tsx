"use client";
import { useState } from "react";

import { CheckboxField } from "@/components/molecules/checkbox-field";
import { FormField } from "@/components/molecules/form-field";
import { EndFields } from "@/features/workers/components/end-fields";
import type { EmploymentFieldsProps } from "@/features/workers/types/worker-ui.types";

export function EmploymentFields({
  stage,
  historical = true,
}: EmploymentFieldsProps) {
  const [closed, setClosed] = useState(Boolean(stage?.end_date));
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 text-sm font-semibold">
        Condiciones de la etapa laboral
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          defaultValue={stage?.start_date}
          id="employment-start"
          label="Fecha de ingreso"
          name="start_date"
          required
          type="date"
        />
        <FormField
          defaultValue={stage?.position ?? ""}
          id="employment-position"
          label="Cargo (opcional)"
          maxLength={150}
          name="position"
        />
        <FormField
          defaultValue={stage?.department ?? ""}
          id="employment-department"
          label="Área (opcional)"
          maxLength={150}
          name="department"
        />
        <FormField
          defaultValue={stage?.contract_type ?? ""}
          id="employment-contract"
          label="Tipo de contrato (opcional)"
          maxLength={100}
          name="contract_type"
        />
        <FormField
          defaultValue={stage?.reference_salary ?? ""}
          hint="Referencia documental; no calcula planilla. Usa punto decimal."
          id="employment-salary"
          inputMode="decimal"
          label="Remuneración de referencia (opcional)"
          maxLength={15}
          name="reference_salary"
        />
        <FormField
          defaultValue={stage?.currency ?? "PEN"}
          id="employment-currency"
          label="Moneda"
          maxLength={3}
          minLength={3}
          name="currency"
          pattern="[A-Z]{3}"
          required
        />
      </div>
      {!stage && historical && (
        <CheckboxField
          checked={closed}
          id="employment-historical"
          label="Registrar una etapa que ya terminó"
          onChange={(event) => setClosed(event.target.checked)}
        />
      )}
      {closed && <EndFields stage={stage} />}
      <p className="text-sm text-zinc-600">
        Un ingreso anterior al inicio de control solicita el checklist actual,
        sin boletas antiguas automáticas. Un cese anterior al control se
        conserva como historia.
      </p>
    </fieldset>
  );
}

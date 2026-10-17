"use client";
import { useState } from "react";

import { FormField } from "@/components/molecules/form-field";
import { FormActions } from "@/features/access/components/form-actions";
import type { SubmitEvent } from "@/features/access/types/access-ui.types";
import { EmploymentFields } from "@/features/workers/components/employment-fields";
import { useWorkerCommand } from "@/features/workers/hooks/use-worker-command";
import type { EmploymentFormProps } from "@/features/workers/types/worker-ui.types";
import { parseEmploymentForm } from "@/features/workers/utils/worker-form";

export function EmploymentForm({ detail, mode, onSaved }: EmploymentFormProps) {
  const action = useWorkerCommand();
  const [validation, setValidation] = useState<string | null>(null);
  const stage =
    mode === "correct" ? (detail.selected_period ?? undefined) : undefined;
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = parseEmploymentForm(data);
    setValidation(
      parsed.success
        ? null
        : parsed.error.issues.map((issue) => issue.message).join(" · "),
    );
    if (!parsed.success) return;
    const input = {
      ...parsed.data,
      company_id: detail.worker.company_id,
      worker_id: detail.worker.id,
      expected_revision: stage?.revision ?? detail.worker.revision,
      ...(stage
        ? { employment_period_id: stage.id, reason: data.get("reason") }
        : {}),
    };
    if (
      await action.submit(
        mode === "correct" ? "CorrectEmployment" : "StartEmployment",
        input,
      )
    )
      onSaved();
  }
  return (
    <form
      className="space-y-5 rounded-xl border border-zinc-200 bg-white p-5"
      onSubmit={submit}
    >
      <h2 className="font-semibold">
        {mode === "correct"
          ? "Corregir condiciones de la etapa"
          : "Registrar nueva etapa laboral"}
      </h2>
      <fieldset className="space-y-5" disabled={action.busy}>
        <EmploymentFields stage={stage} />
        {mode === "correct" && (
          <FormField
            hint="Conserva los documentos emitidos; no reabre la etapa ni reemplaza sus archivos."
            id="employment-correction-reason"
            label="Motivo de corrección"
            maxLength={1000}
            name="reason"
            required
          />
        )}
      </fieldset>
      <FormActions
        busy={action.busy}
        error={validation ?? action.error}
        label={mode === "correct" ? "Guardar corrección" : "Registrar etapa"}
        loadingText="Guardando etapa laboral…"
        onCancel={onSaved}
      />
    </form>
  );
}

"use client";
import { useState } from "react";

import { FormActions } from "@/features/access/components/form-actions";
import type { SubmitEvent } from "@/features/access/types/access-ui.types";
import { EndFields } from "@/features/workers/components/end-fields";
import { useWorkerCommand } from "@/features/workers/hooks/use-worker-command";
import type { EndEmploymentFormProps } from "@/features/workers/types/worker-ui.types";
import { parseEmploymentEnd } from "@/features/workers/utils/worker-form";

export function EndEmploymentForm({ detail, onSaved }: EndEmploymentFormProps) {
  const action = useWorkerCommand();
  const [validation, setValidation] = useState<string | null>(null);
  const stage = detail.selected_period;
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!stage) return;
    const data = new FormData(event.currentTarget);
    const parsed = parseEmploymentEnd(data, stage.start_date);
    setValidation(
      parsed.success
        ? null
        : parsed.error.issues.map((issue) => issue.message).join(" · "),
    );
    if (!parsed.success) return;
    if (
      await action.submit("EndEmployment", {
        company_id: detail.worker.company_id,
        worker_id: detail.worker.id,
        employment_period_id: stage.id,
        expected_revision: stage.revision,
        end_date: parsed.data.end_date,
        termination_reason: parsed.data.termination_reason,
        termination_notes: parsed.data.termination_notes,
      })
    )
      onSaved();
  }
  if (!stage || stage.end_date) return null;
  return (
    <form
      className="space-y-5 rounded-xl border border-zinc-200 bg-white p-5"
      onSubmit={submit}
    >
      <h2 className="font-semibold">
        Registrar cese de la etapa {stage.sequence_number}
      </h2>
      <p className="text-sm text-zinc-600">
        Se conserva toda la documentación de esta relación. El checklist de cese
        seguirá las reglas configuradas.
      </p>
      <fieldset disabled={action.busy}>
        <EndFields />
      </fieldset>
      <FormActions
        busy={action.busy}
        error={validation ?? action.error}
        label="Registrar cese"
        loadingText="Registrando cese…"
        onCancel={onSaved}
      />
    </form>
  );
}

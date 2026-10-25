"use client";
import { useState } from "react";

import { CheckboxField } from "@/components/molecules/checkbox-field";
import { FormActions } from "@/features/access/components/form-actions";
import type { SubmitEvent } from "@/features/access/types/access-ui.types";
import { EmploymentFields } from "@/features/workers/components/employment-fields";
import { WorkerFields } from "@/features/workers/components/worker-fields";
import { useWorkerCommand } from "@/features/workers/hooks/use-worker-command";
import type { WorkerFormProps } from "@/features/workers/types/worker-ui.types";
import {
  parseEmploymentForm,
  parseWorkerForm,
} from "@/features/workers/utils/worker-form";

export function WorkerForm({
  companyId,
  worker,
  onSaved,
  onCancel,
}: WorkerFormProps) {
  const action = useWorkerCommand();
  const [withEmployment, setWithEmployment] = useState(!worker);
  const [validation, setValidation] = useState<string | null>(null);
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = parseWorkerForm(data, companyId);
    const employment =
      !worker && withEmployment ? parseEmploymentForm(data) : null;
    const error = !parsed.success
      ? parsed.error
      : employment && !employment.success
        ? employment.error
        : null;
    setValidation(
      error?.issues.map((issue) => issue.message).join(" · ") ?? null,
    );
    if (!parsed.success || (employment && !employment.success)) return;
    const input = {
      ...parsed.data,
      ...(worker
        ? { worker_id: worker.id, expected_revision: worker.revision }
        : {}),
      ...(employment?.success ? { employment: employment.data } : {}),
    };
    if (await action.submit(worker ? "UpdateWorker" : "RegisterWorker", input))
      onSaved();
  }
  return (
    <form
      className="space-y-6 rounded-xl border border-zinc-200 bg-white p-5"
      onSubmit={submit}
    >
      <h2 className="text-lg font-semibold">
        {worker ? "Editar ficha del trabajador" : "Registrar trabajador"}
      </h2>
      <fieldset className="space-y-6" disabled={action.busy}>
        <WorkerFields worker={worker} />
        {!worker && (
          <CheckboxField
            checked={withEmployment}
            id="worker-with-employment"
            label="Registrar también su periodo laboral"
            onChange={(event) => setWithEmployment(event.target.checked)}
          />
        )}
        {!worker && withEmployment && <EmploymentFields />}
      </fieldset>
      <FormActions
        busy={action.busy}
        error={validation ?? action.error}
        label={worker ? "Guardar ficha" : "Registrar trabajador"}
        loadingText={worker ? "Guardando ficha…" : "Registrando trabajador…"}
        onCancel={onCancel}
      />
    </form>
  );
}

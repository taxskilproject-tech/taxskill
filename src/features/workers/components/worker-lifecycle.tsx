"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { FormField } from "@/components/molecules/form-field";
import { FormActions } from "@/features/access/components/form-actions";
import { useWorkerCommand } from "@/features/workers/hooks/use-worker-command";
import type { WorkerLifecycleProps } from "@/features/workers/types/worker-ui.types";

export function WorkerLifecycle({ worker }: WorkerLifecycleProps) {
  const [opened, setOpened] = useState(false);
  const action = useWorkerCommand();
  return (
    <section className="space-y-4">
      <Button
        disabled={action.busy}
        onClick={() => setOpened(!opened)}
        variant="secondary"
      >
        {worker.deleted_at ? "Restaurar ficha" : "Eliminar ficha lógicamente"}
      </Button>
      {opened && (
        <form
          className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            if (
              await action.submit(
                worker.deleted_at ? "RestoreWorker" : "DeleteWorker",
                {
                  company_id: worker.company_id,
                  worker_id: worker.id,
                  expected_revision: worker.revision,
                  reason: data.get("reason"),
                },
              )
            )
              setOpened(false);
          }}
        >
          <p className="text-sm text-zinc-600">
            La ficha conserva identidad, etapas y archivos. Restaurarla no
            registra ingreso ni reabre una etapa cesada.
          </p>
          <FormField
            disabled={action.busy}
            id="worker-lifecycle-reason"
            label="Motivo"
            maxLength={1000}
            name="reason"
            required
          />
          <FormActions
            busy={action.busy}
            error={action.error}
            label={
              worker.deleted_at
                ? "Confirmar restauración"
                : "Confirmar eliminación lógica"
            }
            loadingText="Actualizando ficha…"
          />
        </form>
      )}
    </section>
  );
}

"use client";

import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { FormField } from "@/components/molecules/form-field";
import { SidePanel } from "@/components/organisms/side-panel";
import { FormActions } from "@/features/access/components/form-actions";
import { useCommand } from "@/features/access/hooks/use-command";
import type {
  LifecycleProps,
  SubmitEvent,
} from "@/features/access/types/access-ui.types";

export function LifecycleControl({
  label,
  entity,
  id,
  revision,
  deleted,
  onChanged,
}: LifecycleProps) {
  const command = useCommand();
  const [confirming, setConfirming] = useState(false);
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const reason = String(
      new FormData(event.currentTarget).get("reason") ?? "",
    ).trim();
    const succeeded = await command.submit(
      deleted ? "RestoreEntity" : "DeleteEntity",
      {
        entity,
        id,
        expected_revision: revision,
        ...(deleted ? {} : { reason }),
      },
    );
    if (succeeded) {
      setConfirming(false);
      onChanged();
    }
  }
  return (
    <>
      <Button onClick={() => setConfirming(true)} variant="secondary">
        {label ?? (deleted ? "Restaurar" : "Eliminar")}
      </Button>
      {confirming && (
        <SidePanel
          title={
            label ?? (deleted ? "Restaurar registro" : "Eliminar registro")
          }
          onClose={() => setConfirming(false)}
        >
          <form
            className="w-full space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4"
            onSubmit={submit}
          >
            <p className="text-sm text-zinc-600">
              {deleted
                ? "Se conservarán el estado anterior y los hijos eliminados por separado."
                : "El registro y su historial se conservarán. Su operación quedará bloqueada."}
            </p>
            {!deleted && (
              <FormField
                disabled={command.busy}
                id={`reason-${id}`}
                label="Motivo de eliminación"
                maxLength={500}
                name="reason"
                required
              />
            )}
            <FormActions
              busy={command.busy}
              error={command.error}
              label={
                deleted ? "Confirmar restauración" : "Confirmar eliminación"
              }
              loadingText={
                deleted ? "Restaurando registro…" : "Eliminando registro…"
              }
              onCancel={() => setConfirming(false)}
            />
          </form>
        </SidePanel>
      )}
    </>
  );
}

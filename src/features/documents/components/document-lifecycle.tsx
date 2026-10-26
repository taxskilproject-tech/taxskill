"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { FormField } from "@/components/molecules/form-field";
import { SidePanel } from "@/components/organisms/side-panel";
import { useDocumentCommand } from "@/features/documents/hooks/use-document-command";
import type { DocumentLifecycleProps } from "@/features/documents/types/document-ui.types";

export function DocumentLifecycle({
  entity,
  id,
  revision,
  deleted,
}: DocumentLifecycleProps) {
  const command = useDocumentCommand();
  const [opened, setOpened] = useState(false);
  const [reason, setReason] = useState("");
  function close() {
    setOpened(false);
    setReason("");
  }
  async function change() {
    if (
      await command.submit(
        deleted ? "RestoreDocumentEntity" : "DeleteDocumentEntity",
        {
          entity,
          id,
          expected_revision: revision,
          reason,
        },
      )
    )
      close();
  }
  return (
    <div className="space-y-3">
      <Button
        disabled={command.busy}
        onClick={() => setOpened(!opened)}
        variant="secondary"
      >
        {deleted ? "Restaurar" : "Eliminar lógicamente"}
      </Button>
      {opened && (
        <SidePanel
          title={
            deleted
              ? "Restaurar tipo o entregable"
              : "Eliminar tipo o entregable"
          }
          onClose={close}
        >
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void change();
            }}
          >
            <FormField
              disabled={command.busy}
              id={`delete-${id}`}
              label={
                deleted ? "Motivo de restauración" : "Motivo de eliminación"
              }
              maxLength={2000}
              required
              onChange={(event) => setReason(event.target.value)}
              value={reason}
            />
            <p className="text-xs text-zinc-600">
              La documentación e historia existentes se conservan.
            </p>
            <Button
              disabled={!reason.trim()}
              loading={command.busy}
              loadingText={deleted ? "Restaurando…" : "Eliminando…"}
              type="submit"
            >
              Confirmar {deleted ? "restauración" : "eliminación"}
            </Button>
            {command.error && (
              <FeedbackMessage kind="error">{command.error}</FeedbackMessage>
            )}
          </form>
        </SidePanel>
      )}
    </div>
  );
}

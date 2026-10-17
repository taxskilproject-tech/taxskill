"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { FormField } from "@/components/molecules/form-field";
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
      setOpened(false);
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
        <div className="space-y-3 rounded-lg border border-zinc-200 p-4">
          {
            <FormField
              disabled={command.busy}
              id={`delete-${id}`}
              label={
                deleted ? "Motivo de restauración" : "Motivo de eliminación"
              }
              maxLength={2000}
              onChange={(event) => setReason(event.target.value)}
              value={reason}
            />
          }
          <p className="text-xs text-zinc-600">
            La documentación e historia existentes se conservan.
          </p>
          <Button
            disabled={!reason.trim()}
            loading={command.busy}
            loadingText={deleted ? "Restaurando…" : "Eliminando…"}
            onClick={() => {
              void change();
            }}
          >
            Confirmar {deleted ? "restauración" : "eliminación"}
          </Button>
        </div>
      )}
      {command.error && (
        <FeedbackMessage kind="error">{command.error}</FeedbackMessage>
      )}
    </div>
  );
}

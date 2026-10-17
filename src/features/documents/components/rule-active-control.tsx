"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { FormField } from "@/components/molecules/form-field";
import { useDocumentCommand } from "@/features/documents/hooks/use-document-command";
import type { RuleEngineProps } from "@/features/documents/types/engine-ui.types";

export function RuleActiveControl({ rule }: RuleEngineProps) {
  const command = useDocumentCommand();
  const [opened, setOpened] = useState(false);
  const [reason, setReason] = useState("");
  async function confirm() {
    if (
      await command.submit("SetRuleActive", {
        rule_id: rule.id,
        expected_revision: rule.revision,
        active: !rule.active,
        reason: reason.trim() || "Activación de regla",
      })
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
        {rule.active ? "Pausar regla" : "Activar regla"}
      </Button>
      {opened && (
        <div className="space-y-3 rounded-lg border border-zinc-200 p-4">
          <p className="text-sm text-zinc-600">
            {rule.active
              ? "La pausa no borra obligaciones ni recupera los ciclos excluidos al reactivar."
              : "Se comprobará el responsable. La generación retoma el periodo vigente y conserva los intervalos de pausa."}
          </p>
          {rule.active && (
            <FormField
              disabled={command.busy}
              id={`pause-${rule.id}`}
              label="Motivo de pausa"
              maxLength={2000}
              onChange={(event) => setReason(event.target.value)}
              value={reason}
            />
          )}
          <Button
            disabled={rule.active && !reason.trim()}
            loading={command.busy}
            loadingText={rule.active ? "Pausando regla…" : "Activando regla…"}
            onClick={() => {
              void confirm();
            }}
          >
            Confirmar {rule.active ? "pausa" : "activación"}
          </Button>
        </div>
      )}
      {command.error && (
        <FeedbackMessage kind="error">{command.error}</FeedbackMessage>
      )}
    </div>
  );
}

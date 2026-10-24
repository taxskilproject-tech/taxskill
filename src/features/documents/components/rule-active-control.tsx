"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { FormField } from "@/components/molecules/form-field";
import { SidePanel } from "@/components/organisms/side-panel";
import { useDocumentCommand } from "@/features/documents/hooks/use-document-command";
import type { RuleEngineProps } from "@/features/documents/types/engine-ui.types";

export function RuleActiveControl({ rule }: RuleEngineProps) {
  const command = useDocumentCommand();
  const [opened, setOpened] = useState(false);
  const [reason, setReason] = useState("");
  function close() {
    setOpened(false);
    setReason("");
  }
  async function confirm() {
    if (
      await command.submit("SetRuleActive", {
        rule_id: rule.id,
        expected_revision: rule.revision,
        active: !rule.active,
        reason: reason.trim() || "Activación de regla",
      })
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
        {rule.active ? "Pausar regla" : "Activar regla"}
      </Button>
      {opened && (
        <SidePanel
          title={rule.active ? "Pausar regla" : "Activar regla"}
          onClose={close}
        >
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void confirm();
            }}
          >
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
                required
                onChange={(event) => setReason(event.target.value)}
                value={reason}
              />
            )}
            <Button
              disabled={rule.active && !reason.trim()}
              loading={command.busy}
              loadingText={rule.active ? "Pausando regla…" : "Activando regla…"}
              type="submit"
            >
              Confirmar {rule.active ? "pausa" : "activación"}
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

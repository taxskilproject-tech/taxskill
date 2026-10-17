"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { FormField } from "@/components/molecules/form-field";
import { canPerform } from "@/domain/access/utils/permissions";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { useDocumentCommand } from "@/features/documents/hooks/use-document-command";
import type { DispositionProps } from "@/features/documents/types/document-ui.types";

export function DispositionControl({ summary }: DispositionProps) {
  const { context } = useWorkspace();
  const command = useDocumentCommand();
  const [reason, setReason] = useState("");
  const waive = canPerform(
    context.capabilities,
    summary.company_id,
    summary.module,
    "waive",
    context.member.member_type,
  );
  if (summary.disposition !== "active" || (!waive && !context.member.is_admin))
    return null;
  function change(operation: "SetNotApplicable" | "CancelObligation") {
    return command.submit(operation, {
      obligation_id: summary.id,
      expected_revision: summary.revision,
      reason,
    });
  }
  return (
    <details className="rounded-xl border border-zinc-200 bg-white p-5">
      <summary className="min-h-11 cursor-pointer text-sm font-medium">
        No aplica o cancelar obligación
      </summary>
      <div className="mt-4 space-y-4">
        <p className="text-sm text-zinc-600">
          Se conserva todo el historial y se retira la obligación de las
          exigibles.
        </p>
        <FormField
          disabled={command.busy}
          id="disposition-reason"
          label="Motivo obligatorio"
          maxLength={2000}
          onChange={(event) => setReason(event.target.value)}
          value={reason}
        />
        <div className="flex flex-wrap gap-3">
          {waive && (
            <Button
              disabled={!reason.trim() || command.busy}
              loading={command.busy}
              loadingText="Registrando disposición…"
              onClick={() => {
                void change("SetNotApplicable");
              }}
              variant="secondary"
            >
              Marcar No aplica
            </Button>
          )}
          {context.member.is_admin && (
            <Button
              disabled={!reason.trim() || command.busy}
              loading={command.busy}
              loadingText="Registrando disposición…"
              onClick={() => {
                void change("CancelObligation");
              }}
              variant="secondary"
            >
              Cancelar obligación
            </Button>
          )}
        </div>
        {command.error && (
          <FeedbackMessage kind="error">{command.error}</FeedbackMessage>
        )}
      </div>
    </details>
  );
}

"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { FormField } from "@/components/molecules/form-field";
import { canPerform } from "@/domain/access/utils/permissions";
import { getLimaDate } from "@/domain/time/utils/instant";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { useDocumentCommand } from "@/features/documents/hooks/use-document-command";
import type { ReviewControlsProps } from "@/features/documents/types/document-ui.types";

export function ReviewControls({ deliverable, summary }: ReviewControlsProps) {
  const { context } = useWorkspace();
  const command = useDocumentCommand();
  const [comment, setComment] = useState("");
  const [due, setDue] = useState("");
  const [editingReason, setEditingReason] = useState(false);
  const today = getLimaDate(new Date());
  function allowed(action: "approve" | "observe" | "reopen") {
    return canPerform(
      context.capabilities,
      summary.company_id,
      summary.module,
      action,
      context.member.member_type,
    );
  }
  async function review(
    operation: "ApproveVersion" | "ObserveVersion" | "ReopenApproved",
  ) {
    const needsReason = operation !== "ApproveVersion";
    await command.submit(operation, {
      deliverable_id: deliverable.id,
      version_id: deliverable.current_version_id,
      expected_revision: deliverable.revision,
      ...(needsReason ? { comment, new_due_date: due } : {}),
    });
  }
  const revisable = deliverable.review_state === "por_revisar";
  const approved = deliverable.review_state === "aprobado";
  const needsReason =
    (revisable && allowed("observe")) || (approved && allowed("reopen"));
  if (!(
    (revisable && (allowed("approve") || allowed("observe"))) ||
    (approved && allowed("reopen"))
  ))
    return null;
  return (
    <section className="space-y-4 border-t border-zinc-100 pt-4">
      <h3 className="text-sm font-medium">Revisión de la versión vigente</h3>
      {needsReason && !editingReason && (
        <Button onClick={() => setEditingReason(true)} variant="secondary">
          {approved ? "Preparar reapertura" : "Preparar observación"}
        </Button>
      )}
      {needsReason && editingReason && (
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            disabled={command.busy}
            id={`comment-${deliverable.id}`}
            label="Motivo de observación o reapertura"
            maxLength={2000}
            onChange={(event) => setComment(event.target.value)}
            value={comment}
          />
          <FormField
            disabled={command.busy}
            id={`due-${deliverable.id}`}
            label="Nuevo plazo de entrega"
            min={today.ok ? today.data : undefined}
            onChange={(event) => setDue(event.target.value)}
            type="date"
            value={due}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {revisable && allowed("approve") && (
          <Button
            disabled={command.busy}
            loading={command.busy}
            loadingText="Registrando decisión…"
            onClick={() => {
              void review("ApproveVersion");
            }}
          >
            Aprobar archivo
          </Button>
        )}
        {revisable && allowed("observe") && editingReason && (
          <Button
            disabled={command.busy || !comment.trim() || !due}
            loading={command.busy}
            loadingText="Registrando decisión…"
            onClick={() => {
              void review("ObserveVersion");
            }}
            variant="secondary"
          >
            Observar archivo
          </Button>
        )}
        {approved && allowed("reopen") && editingReason && (
          <Button
            disabled={command.busy || !comment.trim() || !due}
            loading={command.busy}
            loadingText="Reabriendo archivo…"
            onClick={() => {
              void review("ReopenApproved");
            }}
            variant="secondary"
          >
            Reabrir para nueva versión
          </Button>
        )}
      </div>
      {command.error && (
        <FeedbackMessage kind="error">
          {command.error} No se repite la decisión automáticamente. Actualiza el
          detalle para revisar su estado.
        </FeedbackMessage>
      )}
    </section>
  );
}

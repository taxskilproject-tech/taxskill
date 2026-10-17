"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { FormField } from "@/components/molecules/form-field";
import { DOCUMENT_MODULES } from "@/domain/documents/constants/engine";
import { FormActions } from "@/features/access/components/form-actions";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { ResponsiblePicker } from "@/features/documents/components/responsible-picker";
import { useDocumentCommand } from "@/features/documents/hooks/use-document-command";
import type { ReassignmentProps } from "@/features/documents/types/engine-ui.types";

export function ReassignmentControl({ summary }: ReassignmentProps) {
  const { context } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const action = useDocumentCommand();
  const documentModule =
    summary.module === "actividades"
      ? "actividades"
      : DOCUMENT_MODULES.find((item) => item === summary.module);
  if (!context.member.is_admin || !documentModule) return null;
  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-700">
          {summary.assignment_issue
            ? "Responsable sin acceso de entrega. Requiere reasignación."
            : "El responsable de entrega puede reasignarse conservando el historial."}
        </p>
        <Button
          disabled={action.busy}
          onClick={() => setEditing(!editing)}
          variant="secondary"
        >
          {editing ? "Cerrar reasignación" : "Reasignar responsable"}
        </Button>
      </div>
      {editing && (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const succeeded = await action.submit("ReassignDelivery", {
              obligation_id: summary.id,
              expected_revision: summary.revision,
              delivery_responsible_id: data.get("delivery_responsible_id"),
              reason: data.get("reason"),
            });
            if (succeeded) setEditing(false);
          }}
        >
          <ResponsiblePicker
            companyId={summary.company_id}
            disabled={action.busy}
            module={documentModule}
            selected={summary.delivery_responsible_id}
          />
          <FormField
            disabled={action.busy}
            id={`reassignment-${summary.id}`}
            label="Motivo de reasignación"
            maxLength={1000}
            name="reason"
            required
          />
          <FormActions
            error={action.error}
            label="Guardar responsable"
            loadingText="Reasignando responsable…"
            busy={action.busy}
          />
        </form>
      )}
      {action.result && (
        <p className="text-sm text-zinc-700" role="status">
          Responsable actualizado y aviso registrado.
        </p>
      )}
    </section>
  );
}

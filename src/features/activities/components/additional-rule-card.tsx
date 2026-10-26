"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { FormField } from "@/components/molecules/form-field";
import { SidePanel } from "@/components/organisms/side-panel";
import { FormActions } from "@/features/access/components/form-actions";
import type { SubmitEvent } from "@/features/access/types/access-ui.types";
import { AdditionalForm } from "@/features/activities/components/additional-form";
import type { AdditionalRuleProps } from "@/features/activities/types/activity-ui.types";
import { DocumentLifecycle } from "@/features/documents/components/document-lifecycle";
import { useDocumentCommand } from "@/features/documents/hooks/use-document-command";

export function AdditionalRuleCard({ rule }: AdditionalRuleProps) {
  const [editing, setEditing] = useState(false);
  const [pausing, setPausing] = useState(false);
  const command = useDocumentCommand();
  async function toggle(event: SubmitEvent) {
    event.preventDefault();
    const succeeded = await command.submit("SetRuleActive", {
      rule_id: rule.id,
      expected_revision: rule.revision,
      active: !rule.active,
      reason: new FormData(event.currentTarget).get("reason"),
    });
    if (succeeded) setPausing(false);
  }
  if (rule.deleted_at)
    return (
      <article className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
        <h3 className="font-semibold">{rule.title} · Eliminada</h3>
        <DocumentLifecycle
          deleted
          entity="requirement_rules"
          id={rule.id}
          revision={rule.revision}
        />
      </article>
    );
  return (
    <article className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
      {editing && (
        <SidePanel
          title="Nueva versión de actividad"
          onClose={() => setEditing(false)}
          wide
        >
          <AdditionalForm
            onCancel={() => setEditing(false)}
            onSaved={() => setEditing(false)}
            rule={rule}
          />
        </SidePanel>
      )}
      <h3 className="font-semibold">{rule.title}</h3>
      <p className="text-sm text-zinc-600">
        {rule.active ? "Activa" : "Pausada"} · {rule.configuration.frequency} ·
        Versión {rule.configuration.version_number}
      </p>
      <Button
        disabled={command.busy}
        onClick={() => setEditing(true)}
        variant="secondary"
      >
        Crear nueva versión
      </Button>
      <Button onClick={() => setPausing(true)} variant="secondary">
        Pausar o reactivar
      </Button>
      {pausing && (
        <SidePanel
          title="Pausar o reactivar actividad"
          onClose={() => setPausing(false)}
        >
          <form className="space-y-3" onSubmit={toggle}>
            <FormField
              disabled={command.busy}
              id={`additional-rule-${rule.id}`}
              label="Motivo para pausar o reactivar"
              maxLength={1000}
              name="reason"
              required
            />
            <FormActions
              busy={command.busy}
              error={command.error}
              label={rule.active ? "Pausar entregable" : "Reactivar entregable"}
              loadingText="Actualizando entregable…"
              onCancel={() => setPausing(false)}
            />
          </form>
        </SidePanel>
      )}
      <DocumentLifecycle
        deleted={Boolean(rule.deleted_at)}
        entity="requirement_rules"
        id={rule.id}
        revision={rule.revision}
      />
    </article>
  );
}

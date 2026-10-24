"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { FormField } from "@/components/molecules/form-field";
import { SidePanel } from "@/components/organisms/side-panel";
import { FormActions } from "@/features/access/components/form-actions";
import type { SubmitEvent } from "@/features/access/types/access-ui.types";
import { GenerationResult } from "@/features/documents/components/generation-result";
import { useDocumentCommand } from "@/features/documents/hooks/use-document-command";
import type { RuleEngineProps } from "@/features/documents/types/engine-ui.types";

export function RuleEventControl({ rule }: RuleEngineProps) {
  const command = useDocumentCommand();
  const [opened, setOpened] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const id = eventId ?? crypto.randomUUID();
    setEventId(id);
    const data = new FormData(event.currentTarget);
    if (
      await command.submit("EmitRequirementEvent", {
        rule_id: rule.id,
        event_id: id,
        event_type: "manual_request",
        reference_date: data.get("event_reference"),
      })
    ) {
      setOpened(false);
      setEventId(null);
    }
  }
  if (
    rule.module === "laboral_trabajador" ||
    !rule.configuration.applicability_conditions.event_types.includes(
      "manual_request",
    )
  )
    return (
      <p className="text-sm text-zinc-600">
        Se genera desde un evento identificado de la etapa laboral; su operación
        se incorpora en H05.
      </p>
    );
  return (
    <section className="space-y-3">
      <Button
        disabled={command.busy}
        onClick={() => setOpened(!opened)}
        variant="secondary"
      >
        Registrar solicitud identificada
      </Button>
      {opened && (
        <SidePanel
          title="Registrar solicitud identificada"
          onClose={() => setOpened(false)}
        >
          <form
            className="space-y-3 rounded-lg border border-zinc-200 p-4"
            onSubmit={submit}
          >
            <FormField
              disabled={command.busy}
              id={`event-date-${rule.id}`}
              label="Fecha de referencia de la solicitud"
              name="event_reference"
              required
              type="date"
            />
            <p className="text-sm text-zinc-600">
              Un reintento conserva la identidad de esta solicitud y no crea
              otra obligación.
            </p>
            <FormActions
              busy={command.busy}
              error={command.error}
              label="Crear obligación del evento"
              loadingText="Registrando solicitud…"
              onCancel={() => setOpened(false)}
            />
          </form>
        </SidePanel>
      )}
      <GenerationResult result={command.result} />
    </section>
  );
}

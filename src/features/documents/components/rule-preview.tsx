"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { FormField } from "@/components/molecules/form-field";
import type { CalendarPreview } from "@/domain/documents/types/engine.types";
import { useAction } from "@/features/access/hooks/use-action";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { previewRule } from "@/features/documents/repositories/engine.repository";
import type { RulePreviewProps } from "@/features/documents/types/engine-ui.types";
import { readRecurrenceForm } from "@/features/documents/utils/requirement-input";

export function RulePreview({ form }: RulePreviewProps) {
  const { context } = useWorkspace();
  const action = useAction<CalendarPreview>();
  const [requestedStart, setRequestedStart] = useState<string | null>(null);
  async function preview() {
    if (!form.current) return;
    const input = readRecurrenceForm(new FormData(form.current));
    const result = await action.run(() =>
      previewRule(context.organization.id, input),
    );
    if (result) setRequestedStart(input.reference_date);
  }
  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 p-4">
      <FormField
        hint="Vacío: utiliza el inicio solicitado o la fecha de aplicación de cambios. La simulación no crea obligaciones."
        id="rule-preview-date"
        label="Probar otra fecha (opcional)"
        name="reference_date"
        type="date"
      />
      <Button
        loading={action.busy}
        loadingText="Calculando periodo y plazo…"
        onClick={() => {
          void preview();
        }}
        variant="secondary"
      >
        Ver primer periodo y fecha límite
      </Button>
      {action.error && (
        <FeedbackMessage kind="error">{action.error}</FeedbackMessage>
      )}
      {action.result && (
        <div aria-live="polite" className="space-y-2 text-sm text-zinc-700">
          <p>Inicio solicitado: {requestedStart ?? "hoy en Lima"}.</p>
          <p>
            Primer periodo: {action.result.start_date} a{" "}
            {action.result.end_date}.
          </p>
          <p>Fecha límite: {action.result.due_date}.</p>
          {action.result.overdue && (
            <p>El plazo ya venció; al generar se conservará sin ajustes.</p>
          )}
        </div>
      )}
    </section>
  );
}

"use client";
import type { FormEvent } from "react";

import { Button } from "@/components/atoms/button";
import { CheckboxField } from "@/components/molecules/checkbox-field";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { FormField } from "@/components/molecules/form-field";

import { useSunatAction } from "../hooks/use-sunat-action";
import type { SunatWorkspaceProps } from "../types/ui.types";

export function SunatScheduleForm({
  workspace,
  onChanged,
}: SunatWorkspaceProps) {
  const action = useSunatAction();
  const connection = workspace.connection;
  if (!connection || connection.state !== "connected") return null;
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!connection) return;
    const data = new FormData(event.currentTarget);
    if (
      await action.submit("UpdateSchedule", {
        company_id: workspace.company.id,
        expected_revision: connection.revision,
        daily_enabled: data.has("daily_enabled"),
        daily_time: data.get("daily_time"),
      })
    )
      onChanged();
  }
  return (
    <form className="space-y-3 border-t border-slate-200 pt-4" onSubmit={save}>
      <h3 className="font-semibold">Revisión diaria</h3>
      <CheckboxField
        id="sunat-daily"
        name="daily_enabled"
        label="Consultar novedades diariamente"
        defaultChecked={connection.daily_enabled}
        disabled={action.busy}
      />
      <FormField
        id="sunat-daily-time"
        name="daily_time"
        label="Hora de consulta · Lima"
        type="time"
        defaultValue={connection.daily_time.slice(0, 5)}
        required
        disabled={action.busy}
      />
      {action.error && (
        <FeedbackMessage kind="error">{action.error}</FeedbackMessage>
      )}
      <Button
        type="submit"
        variant="secondary"
        loading={action.busy}
        loadingText="Guardando horario…"
      >
        Guardar horario
      </Button>
    </form>
  );
}

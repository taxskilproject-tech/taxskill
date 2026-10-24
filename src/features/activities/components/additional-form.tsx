"use client";
import { useRef, useState } from "react";

import type { Frequency } from "@/domain/documents/types/engine.types";
import { FormActions } from "@/features/access/components/form-actions";
import { FormSteps } from "@/features/access/components/form-steps";
import { useFormSteps } from "@/features/access/hooks/use-form-steps";
import type { SubmitEvent } from "@/features/access/types/access-ui.types";
import { AdditionalFields } from "@/features/activities/components/additional-fields";
import type { AdditionalFormProps } from "@/features/activities/types/activity-ui.types";
import { parseAdditionalInput } from "@/features/activities/utils/additional-input";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { DraftSummary } from "@/features/documents/components/draft-summary";
import { RecurrenceFields } from "@/features/documents/components/recurrence-fields";
import { ResponsiblePicker } from "@/features/documents/components/responsible-picker";
import { RuleSlots } from "@/features/documents/components/rule-slots";
import { useDocumentCommand } from "@/features/documents/hooks/use-document-command";

export function AdditionalForm({
  companyId,
  rule,
  onSaved,
  onCancel,
}: AdditionalFormProps) {
  const { context } = useWorkspace();
  const form = useRef<HTMLFormElement>(null);
  const steps = useFormSteps(form, 4);
  const [selectedCompany, setCompany] = useState(
    rule?.company_id ?? companyId ?? "",
  );
  const [frequency, setFrequency] = useState<Frequency>(
    rule?.configuration.frequency ?? "unica",
  );
  const [maximum, setMaximum] = useState(
    rule?.configuration.max_file_bytes ??
      context.organization.settings.default_max_file_bytes,
  );
  const [validation, setValidation] = useState<string | null>(null);
  const command = useDocumentCommand();
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (steps.step < 3) {
      steps.next();
      return;
    }
    if (!steps.validate()) return;
    const parsed = parseAdditionalInput(
      new FormData(event.currentTarget),
      rule,
    );
    setValidation(
      parsed.success
        ? null
        : parsed.error.issues.map((issue) => issue.message).join(" · "),
    );
    if (
      parsed.success &&
      (await command.submit(
        rule ? "ConfigureAdditionalRequirement" : "CreateAdditionalActivity",
        parsed.data,
      ))
    )
      onSaved();
  }
  return (
    <form
      className="space-y-5 rounded-xl border border-zinc-200 bg-white p-5"
      ref={form}
      noValidate
      onSubmit={submit}
    >
      <h2 className="text-lg font-semibold">
        {rule
          ? "Nueva versión de actividad recurrente"
          : "Crear actividad adicional"}
      </h2>
      <p className="text-sm text-zinc-600">
        Exige archivos y aprobación. Su cumplimiento se calcula por separado del
        documental.
        {rule ? " La nueva versión aplica al próximo ciclo no iniciado." : ""}
      </p>
      <FormSteps
        busy={command.busy}
        labels={[
          "Contexto",
          "Periodicidad",
          "Archivos",
          "Responsable y resumen",
        ]}
        step={steps.step}
        onSelect={steps.select}
        onNext={steps.next}
        onBack={steps.back}
      />
      <fieldset className="space-y-5" disabled={command.busy}>
        <div data-form-step="0" hidden={steps.step !== 0} className="space-y-4">
          <AdditionalFields
            companyId={selectedCompany}
            fixedCompany={companyId}
            maximum={maximum}
            onCompany={setCompany}
            onMaximum={setMaximum}
            rule={rule}
          />
        </div>
        <div data-form-step="1" hidden={steps.step !== 1} className="space-y-4">
          <RecurrenceFields
            allowEventual={false}
            configuration={rule?.configuration}
            frequency={frequency}
            onFrequency={setFrequency}
          />
        </div>
        <div data-form-step="2" hidden={steps.step !== 2}>
          <RuleSlots
            maximum={maximum}
            slots={rule?.configuration.deliverable_specs}
          />
        </div>
        <div data-form-step="3" hidden={steps.step !== 3} className="space-y-4">
          <DraftSummary data={steps.summary} />
          <ResponsiblePicker
            companyId={selectedCompany || null}
            module="actividades"
            key={selectedCompany}
            selected={rule?.delivery_responsible_id}
          />
          <p className="text-sm text-zinc-600">
            Revisa los pasos antes de confirmar. Se guardarán todos los archivos
            y la periodicidad configurada.
          </p>
        </div>
      </fieldset>
      <div hidden={steps.step !== 3}>
        <FormActions
          busy={command.busy}
          error={validation ?? command.error}
          label={rule ? "Guardar nueva versión" : "Crear actividad"}
          loadingText={rule ? "Guardando nueva versión…" : "Creando actividad…"}
          onCancel={onCancel}
        />
      </div>
    </form>
  );
}

import { useState } from "react";

import { CheckboxField } from "@/components/molecules/checkbox-field";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { templateConfigurationSchema } from "@/domain/documents/contracts/template.schema";
import type { Frequency } from "@/domain/documents/types/engine.types";
import { FormActions } from "@/features/access/components/form-actions";
import type { SubmitEvent } from "@/features/access/types/access-ui.types";
import type { TemplateEditorProps } from "@/features/deliverable-templates/types/template-ui.types";
import { RecurrenceFields } from "@/features/documents/components/recurrence-fields";
import { RuleSlots } from "@/features/documents/components/rule-slots";
import {
  readDeliverableSpecs,
  readRecurrenceForm,
} from "@/features/documents/utils/requirement-input";

export function TemplateEditor({
  item,
  busy,
  error,
  onSave,
  onCancel,
}: TemplateEditorProps) {
  const [frequency, setFrequency] = useState<Frequency | null>(
    item.configuration.frequency,
  );
  const [validation, setValidation] = useState<string | null>(null);
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const specs = readDeliverableSpecs(data);
    const recurrence = readRecurrenceForm(data);
    const parsed = templateConfigurationSchema.safeParse({
      ...item.configuration,
      ...recurrence,
      frequency,
      deadline_offset_days: String(data.get("deadline_offset_days") ?? "")
        ? Number(data.get("deadline_offset_days"))
        : null,
      allowed_formats: [
        ...new Set(specs.flatMap((spec) => spec.allowed_formats)),
      ],
      deliverable_specs: specs,
    });
    if (!parsed.success) {
      setValidation(
        parsed.error.issues.map((issue) => issue.message).join(" · "),
      );
      return;
    }
    setValidation(null);
    await onSave({
      ...item,
      included: data.has("included"),
      configuration: parsed.data,
    });
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="text-sm text-slate-600">
        Editas la plantilla. Las empresas ya creadas conservan su configuración.
        Puedes guardar un borrador con periodicidad o plazo pendientes.
      </p>
      <fieldset disabled={busy} className="space-y-4">
        <CheckboxField
          id="template-included"
          name="included"
          label="Incluir este entregable en la plantilla"
          defaultChecked={item.included}
        />
        <RecurrenceFields
          frequency={frequency}
          onFrequency={setFrequency}
          configuration={item.configuration}
          allowIncomplete
        />
        <RuleSlots
          maximum={item.configuration.max_file_bytes}
          slots={item.configuration.deliverable_specs}
        />
      </fieldset>
      {validation && (
        <FeedbackMessage kind="error">{validation}</FeedbackMessage>
      )}
      <FormActions
        busy={busy}
        error={error}
        label="Guardar configuración"
        loadingText="Guardando entregable…"
        onCancel={onCancel}
      />
    </form>
  );
}

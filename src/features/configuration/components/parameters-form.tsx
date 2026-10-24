"use client";

import { useState } from "react";

import { FormField } from "@/components/molecules/form-field";
import { organizationSchema } from "@/domain/access/contracts/access.schema";
import { FormActions } from "@/features/access/components/form-actions";
import { useCommand } from "@/features/access/hooks/use-command";
import type { SubmitEvent } from "@/features/access/types/access-ui.types";
import { parseForm, readForm } from "@/features/access/utils/form-data";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import type { ParametersFormProps } from "@/features/configuration/types/configuration.types";
import { FileSizeField } from "@/features/documents/components/file-size-field";

export function ParametersForm({ onSaved }: ParametersFormProps) {
  const { context } = useWorkspace();
  const command = useCommand();
  const [validation, setValidation] = useState<string | null>(null);
  const settings = context.organization.settings;
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const input = readForm(event.currentTarget);
    const parsed = parseForm(organizationSchema, {
      id: context.organization.id,
      expected_revision: context.organization.revision,
      name: input.name,
      settings: {
        schema_version: 1,
        upcoming_days: Number(input.upcoming_days),
        digest_local_time: input.digest_local_time,
        generation_local_time: input.generation_local_time,
        default_max_file_bytes: Number(input.default_max_file_bytes),
        allowed_formats: String(input.allowed_formats)
          .split(",")
          .map((value) => value.trim()),
        compliance_thresholds: {
          green: Number(input.green),
          yellow: Number(input.yellow),
        },
      },
    });
    setValidation(parsed.error);
    if (parsed.data && (await command.submit("SaveOrganization", parsed.data)))
      onSaved?.();
  }
  return (
    <form
      className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6"
      onSubmit={submit}
    >
      <h2 className="text-lg font-semibold">Parámetros del estudio</h2>
      <fieldset className="grid gap-4 sm:grid-cols-2" disabled={command.busy}>
        <FormField
          defaultValue={context.organization.name}
          id="org-name"
          label="Nombre del estudio"
          name="name"
          required
        />
        <FormField
          defaultValue={settings.upcoming_days}
          id="upcoming-days"
          label="Próximos vencimientos (días)"
          max={365}
          min={1}
          name="upcoming_days"
          required
          type="number"
        />
        <FormField
          defaultValue={settings.digest_local_time}
          id="digest-time"
          label="Resumen diario (hora de Lima)"
          name="digest_local_time"
          required
          type="time"
        />
        <FormField
          defaultValue={settings.generation_local_time}
          id="generation-time"
          label="Generación (hora de Lima)"
          name="generation_local_time"
          required
          type="time"
        />
        <FileSizeField
          defaultValue={settings.default_max_file_bytes}
          id="max-file-bytes"
          label="Tamaño máximo por archivo"
          maximum={50000000}
          name="default_max_file_bytes"
        />
        <FormField
          defaultValue={settings.allowed_formats.join(",")}
          hint="Extensiones separadas por coma, sin puntos."
          id="allowed-formats"
          label="Formatos permitidos"
          name="allowed_formats"
          required
        />
        <FormField
          defaultValue={settings.compliance_thresholds.green}
          id="threshold-green"
          label="Cumplimiento verde (%)"
          max={100}
          min={1}
          name="green"
          required
          type="number"
        />
        <FormField
          defaultValue={settings.compliance_thresholds.yellow}
          id="threshold-yellow"
          label="Cumplimiento amarillo (%)"
          max={99}
          min={0}
          name="yellow"
          required
          type="number"
        />
      </fieldset>
      <p className="text-xs leading-6 text-zinc-500">
        Zona horaria: America/Lima. Los procesos documentales y avisos usan
        estos parámetros. Los cambios documentales se conservan en cada nueva
        obligación.
      </p>
      <FormActions
        busy={command.busy}
        error={validation ?? command.error}
        success={command.result ? "Parámetros actualizados." : undefined}
      />
    </form>
  );
}

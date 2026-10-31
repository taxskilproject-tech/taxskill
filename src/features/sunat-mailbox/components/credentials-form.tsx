"use client";
import type { FormEvent } from "react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/atoms/button";
import { CheckboxField } from "@/components/molecules/checkbox-field";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { FormField } from "@/components/molecules/form-field";
import { failure } from "@/domain/common/utils/operation-result";
import { SUNAT_READ_WARNING } from "@/domain/sunat/constants/sunat";
import {
  saveSunatCredentialsSchema,
  sunatCommandResultSchema,
} from "@/domain/sunat/contracts/sunat.schema";
import type { SunatCommandResult } from "@/domain/sunat/types/sunat.types";
import { useAction } from "@/features/access/hooks/use-action";
import { useWorkspace } from "@/features/auth/providers/workspace-context";

import {
  callSunatApi,
  waitForSunatJob,
} from "../repositories/sunat.repository";
import type { SunatWorkspaceProps } from "../types/ui.types";
import { activeSunatJob } from "../utils/presentation";

export function SunatCredentialsForm({
  workspace,
  onChanged,
}: SunatWorkspaceProps) {
  const { context } = useWorkspace();
  const action = useAction<SunatCommandResult>();
  const requestId = useRef(crypto.randomUUID());
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const busy = action.busy || Boolean(activeSunatJob(workspace));
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (controller.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = saveSunatCredentialsSchema.safeParse({
      organization_id: context.organization.id,
      company_id: workspace.company.id,
      request_id: requestId.current,
      expected_revision: workspace.connection?.revision ?? -1,
      sol_username: data.get("sol_username"),
      sol_password: data.get("sol_password"),
      consent: data.has("consent"),
    });
    const abort = new AbortController();
    controller.current = abort;
    try {
      await action.run(async () => {
        if (!input.success)
          return failure({
            code: "VALIDATION_ERROR",
            message: "Completa el usuario, la clave SOL y la autorización.",
          });
        const response = await callSunatApi(
          "/api/sunat/credentials",
          input.data,
          sunatCommandResultSchema,
        );
        if (!response.ok) return response;
        form.reset();
        requestId.current = crypto.randomUUID();
        onChanged();
        return waitForSunatJob(response.data, abort.signal);
      });
    } finally {
      controller.current = null;
      onChanged();
    }
  }
  return (
    <form
      className="space-y-4"
      onSubmit={save}
      onChange={() => {
        requestId.current = crypto.randomUUID();
        action.clear();
      }}
    >
      <h3 className="font-semibold">
        {workspace.connection
          ? "Actualizar credenciales SOL"
          : "Conectar Buzón SUNAT"}
      </h3>
      <FormField
        id="sunat-ruc"
        label="RUC de la empresa"
        value={workspace.company.ruc}
        readOnly
      />
      <fieldset disabled={busy} className="space-y-4">
        <FormField
          id="sol-username"
          name="sol_username"
          label="Usuario SOL"
          maxLength={64}
          required
          autoComplete="off"
        />
        <FormField
          id="sol-password"
          name="sol_password"
          label="Clave SOL"
          type="password"
          maxLength={128}
          required
          autoComplete="new-password"
          hint="La clave se guarda cifrada y no se muestra al equipo interno."
        />
        <CheckboxField
          id="sunat-read-consent"
          name="consent"
          label={SUNAT_READ_WARNING}
          required
        />
      </fieldset>
      {action.error && (
        <FeedbackMessage kind="error">{action.error}</FeedbackMessage>
      )}
      {action.result?.state === "complete" && (
        <FeedbackMessage kind="success">
          Conexión verificada correctamente.
        </FeedbackMessage>
      )}
      <Button
        type="submit"
        disabled={!workspace.worker_ready || Boolean(activeSunatJob(workspace))}
        loading={action.busy}
        loadingText="Guardando y verificando…"
      >
        Guardar y verificar conexión
      </Button>
    </form>
  );
}

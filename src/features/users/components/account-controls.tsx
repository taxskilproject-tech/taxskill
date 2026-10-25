"use client";

import { useState } from "react";

import { FormField } from "@/components/molecules/form-field";
import {
  enabledSchema,
  passwordSchema,
} from "@/domain/access/contracts/access.schema";
import { FormActions } from "@/features/access/components/form-actions";
import type {
  SubmitEvent,
  UserDetailProps,
} from "@/features/access/types/access-ui.types";
import { parseForm, readForm } from "@/features/access/utils/form-data";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { useAdminCommand } from "@/features/users/hooks/use-admin-command";

export function AccountControls({ user, onChanged }: UserDetailProps) {
  const { context } = useWorkspace();
  const ownAccount = context.profile.user_id === user.profile.user_id;
  const password = useAdminCommand();
  const enabled = useAdminCommand();
  const [validation, setValidation] = useState<string | null>(null);
  async function changePassword(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = parseForm(passwordSchema, {
      ...readForm(form),
      expected_revision: user.profile.revision,
    });
    setValidation(parsed.error);
    if (
      parsed.data &&
      (await password.submit(
        "SetUserPassword",
        parsed.data,
        user.profile.user_id,
      ))
    ) {
      form.reset();
      onChanged();
    }
  }
  async function changeEnabled(event: SubmitEvent) {
    event.preventDefault();
    const parsed = parseForm(enabledSchema, {
      enabled: !user.profile.enabled,
      expected_revision: user.profile.revision,
    });
    if (
      parsed.data &&
      (await enabled.submit(
        "SetUserEnabled",
        parsed.data,
        user.profile.user_id,
      ))
    )
      onChanged();
  }
  return (
    <div className="space-y-3">
      <details>
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
          Cambiar contraseña
        </summary>
        <form
          className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
          onChange={password.resetIntent}
          onSubmit={changePassword}
        >
          <h3 className="font-medium">Cambio administrativo de contraseña</h3>
          <FormField
            autoComplete="new-password"
            disabled={password.busy}
            id="new-password"
            label="Nueva contraseña"
            maxLength={128}
            minLength={12}
            name="password"
            required
            type="password"
          />
          <p className="text-xs leading-6 text-zinc-500">
            Las sesiones admitidas se revocan. El usuario deberá ingresar de
            nuevo.
          </p>
          <FormActions
            busy={password.busy}
            error={validation ?? password.error}
            label="Establecer contraseña"
            loadingText="Cambiando contraseña…"
            success={
              password.result
                ? "Contraseña actualizada; sesiones revocadas."
                : undefined
            }
          />
        </form>
      </details>
      <form
        className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
        onSubmit={changeEnabled}
      >
        <h3 className="font-medium">Estado de la cuenta</h3>
        <p className="text-sm text-zinc-600">
          {user.profile.enabled
            ? "Cuenta habilitada. La inhabilitación bloqueará su acceso al negocio."
            : "Cuenta inhabilitada. Al habilitarla deberá iniciar una sesión nueva."}
        </p>
        <p className="text-xs text-zinc-500">
          {ownAccount
            ? "Otro administrador debe cambiar el estado de tu cuenta."
            : "El último administrador efectivo está protegido."}
        </p>
        <FormActions
          busy={enabled.busy}
          disabled={ownAccount}
          error={enabled.error}
          label={
            user.profile.enabled ? "Inhabilitar cuenta" : "Habilitar cuenta"
          }
          loadingText="Actualizando acceso…"
          success={enabled.result ? "Estado actualizado." : undefined}
        />
      </form>
    </div>
  );
}

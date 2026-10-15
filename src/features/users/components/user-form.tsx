"use client";

import { useState } from "react";

import { CheckboxField } from "@/components/molecules/checkbox-field";
import { FormField } from "@/components/molecules/form-field";
import { SelectField } from "@/components/molecules/select-field";
import { createUserSchema } from "@/domain/access/contracts/access.schema";
import { DOCUMENT_MODULES } from "@/domain/common/constants/modules";
import { FormActions } from "@/features/access/components/form-actions";
import type {
  SubmitEvent,
  UserFormProps,
} from "@/features/access/types/access-ui.types";
import { parseForm, readForm } from "@/features/access/utils/form-data";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { useAdminCommand } from "@/features/users/hooks/use-admin-command";

export function UserForm({ directory, onSaved, onCancel }: UserFormProps) {
  const command = useAdminCommand();
  const { context } = useWorkspace();
  const [memberType, setMemberType] = useState("internal");
  const [validation, setValidation] = useState<string | null>(null);
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = readForm(form);
    const grants = input.company_id
      ? [
          {
            company_id: input.company_id,
            scope: "company",
            module: input.module,
            role_id: input.role_id,
            active: true,
            overrides: [],
          },
        ]
      : [];
    const parsed = parseForm(createUserSchema, {
      ...input,
      is_admin: input.is_admin === "on",
      grants,
    });
    setValidation(parsed.error);
    if (!parsed.data) return;
    if (await command.submit("CreateUser", parsed.data)) {
      form.reset();
      onSaved();
    }
  }
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="mb-5 text-lg font-semibold">Crear cuenta</h2>
      <form
        className="space-y-6"
        onChange={command.resetIntent}
        onSubmit={submit}
      >
        <fieldset className="grid gap-4 sm:grid-cols-2" disabled={command.busy}>
          <FormField
            autoComplete="off"
            id="user-name"
            label="Nombre completo"
            maxLength={150}
            name="full_name"
            required
          />
          <FormField
            autoComplete="off"
            id="user-email"
            label="Correo de acceso"
            name="email"
            required
            type="email"
          />
          <FormField
            autoComplete="new-password"
            hint="Mínimo 12 caracteres. Comunícala al usuario por el procedimiento del estudio."
            id="user-password"
            label="Contraseña inicial"
            maxLength={128}
            minLength={12}
            name="password"
            required
            type="password"
          />
          <FormField
            hint="Opcional. Formato internacional, por ejemplo +51900000000."
            id="user-phone"
            label="WhatsApp"
            name="whatsapp_phone"
            type="tel"
          />
          <SelectField
            id="member-type"
            label="Tipo de miembro"
            name="member_type"
            onChange={(event) => setMemberType(event.target.value)}
            value={memberType}
          >
            <option value="internal">Equipo interno</option>
            <option value="client">Cliente</option>
          </SelectField>
          {memberType === "internal" && (
            <CheckboxField
              id="new-admin"
              label="Administrador del estudio"
              name="is_admin"
            />
          )}
        </fieldset>
        <fieldset
          className="grid gap-4 rounded-lg bg-zinc-50 p-4 sm:grid-cols-3"
          disabled={command.busy}
        >
          <legend className="text-sm font-medium">
            Primera asignación (opcional)
          </legend>
          <SelectField id="first-company" label="Empresa" name="company_id">
            <option value="">Sin asignación inicial</option>
            {context.companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.legal_name}
              </option>
            ))}
          </SelectField>
          <SelectField id="first-module" label="Módulo" name="module">
            {DOCUMENT_MODULES.map((module) => (
              <option key={module.id} value={module.id}>
                {module.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            id="first-role"
            key={memberType}
            label="Rol"
            name="role_id"
          >
            {directory.roles
              .filter(
                (role) =>
                  role.audience === memberType &&
                  role.active &&
                  !role.deleted_at,
              )
              .map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
          </SelectField>
        </fieldset>
        <p className="text-sm text-zinc-500">
          La cuenta se habilita al completar Auth y sus accesos. Si falla,
          conserva el formulario y reintenta la misma operación.
        </p>
        <FormActions
          busy={command.busy}
          error={validation ?? command.error}
          label="Crear usuario"
          loadingText="Creando cuenta y accesos…"
          onCancel={onCancel}
        />
      </form>
    </section>
  );
}

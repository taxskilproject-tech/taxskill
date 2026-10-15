"use client";

import { useState } from "react";

import { CheckboxField } from "@/components/molecules/checkbox-field";
import { FormField } from "@/components/molecules/form-field";
import { SelectField } from "@/components/molecules/select-field";
import { REVIEW_ACTIONS } from "@/domain/access/constants/access";
import { ACTION_LABELS } from "@/domain/access/constants/action-labels";
import { roleSchema } from "@/domain/access/contracts/access.schema";
import { DOCUMENT_MODULES } from "@/domain/common/constants/modules";
import { FormActions } from "@/features/access/components/form-actions";
import { useCommand } from "@/features/access/hooks/use-command";
import type {
  RoleFormProps,
  SubmitEvent,
} from "@/features/access/types/access-ui.types";
import { parseForm, readForm } from "@/features/access/utils/form-data";

export function RoleForm({
  role,
  directory,
  onSaved,
  onCancel,
}: RoleFormProps) {
  const command = useCommand();
  const [audience, setAudience] = useState(role?.audience ?? "internal");
  const [validation, setValidation] = useState<string | null>(null);
  const selectedPermissions = new Set(
    directory.rolePermissions
      .filter(
        (relation) => relation.role_id === role?.id && !relation.deleted_at,
      )
      .map((relation) => relation.permission_id),
  );
  const availablePermissions = directory.permissions.filter(
    (permission) =>
      audience !== "client" ||
      !REVIEW_ACTIONS.some((action) => action === permission.action),
  );
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = parseForm(roleSchema, {
      ...readForm(form),
      active: new FormData(form).get("active") === "on",
      permission_ids: new FormData(form).getAll("permission_ids"),
      ...(role ? { id: role.id, expected_revision: role.revision } : {}),
    });
    setValidation(parsed.error);
    if (parsed.data && (await command.submit("SaveRole", parsed.data)))
      onSaved();
  }
  return (
    <form
      className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6"
      onSubmit={submit}
    >
      <h2 className="text-lg font-semibold">
        {role ? "Editar plantilla de rol" : "Nueva plantilla de rol"}
      </h2>
      <fieldset className="grid gap-4 sm:grid-cols-2" disabled={command.busy}>
        <FormField
          defaultValue={role?.name}
          id="role-name"
          label="Nombre"
          name="name"
          required
        />
        <FormField
          defaultValue={role?.code}
          hint="Minúsculas, números y guiones bajos. Identificador estable."
          id="role-code"
          label="Código"
          name="code"
          pattern="[a-z][a-z0-9_]*"
          readOnly={Boolean(role)}
          required
        />
        <FormField
          defaultValue={role?.description ?? ""}
          id="role-description"
          label="Descripción"
          name="description"
        />
        <SelectField
          id="role-audience"
          label="Audiencia"
          name="audience"
          onChange={(event) => setAudience(event.target.value)}
          value={audience}
        >
          <option value="internal">Equipo interno</option>
          <option value="client">Cliente</option>
        </SelectField>
        <CheckboxField
          defaultChecked={role?.active ?? true}
          id="role-active"
          label="Rol activo"
          name="active"
        />
      </fieldset>
      <div className="grid gap-4 lg:grid-cols-2">
        {DOCUMENT_MODULES.map((module) => (
          <fieldset
            className="rounded-lg border border-zinc-200 px-4 py-2"
            disabled={command.busy}
            key={module.id}
          >
            <legend className="px-2 text-sm font-medium">{module.name}</legend>
            {availablePermissions
              .filter((permission) => permission.module === module.id)
              .map((permission) => (
                <CheckboxField
                  defaultChecked={selectedPermissions.has(permission.id)}
                  id={`permission-${permission.id}`}
                  key={permission.id}
                  label={ACTION_LABELS[permission.action] ?? permission.action}
                  name="permission_ids"
                  value={permission.id}
                />
              ))}
          </fieldset>
        ))}
      </div>
      <p className="text-xs leading-6 text-zinc-500">
        Los roles conceden acciones documentales. La administración se configura
        en la membresía y no puede concederse a clientes.
      </p>
      <FormActions
        busy={command.busy}
        error={validation ?? command.error}
        label="Guardar rol y permisos"
        loadingText="Guardando plantilla…"
        onCancel={onCancel}
      />
    </form>
  );
}

"use client";

import { useState } from "react";

import { grantSchema } from "@/domain/access/contracts/access.schema";
import { DOCUMENT_MODULES } from "@/domain/common/constants/modules";
import type { ModuleId } from "@/domain/common/types/module.types";
import { FormActions } from "@/features/access/components/form-actions";
import { useCommand } from "@/features/access/hooks/use-command";
import type {
  GrantFormProps,
  SubmitEvent,
} from "@/features/access/types/access-ui.types";
import { parseForm, readForm } from "@/features/access/utils/form-data";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { GrantContextFields } from "@/features/users/components/grant-context-fields";
import { GrantOverrides } from "@/features/users/components/grant-overrides";

export function GrantForm({
  user,
  directory,
  grant,
  overrides,
  onSaved,
  onCancel,
}: GrantFormProps) {
  const command = useCommand();
  const { context } = useWorkspace();
  const [module, setModule] = useState<ModuleId>(
    DOCUMENT_MODULES.find((item) => item.id === grant?.module)?.id ??
      "tributario",
  );
  const [scope, setScope] = useState(grant?.scope ?? "company");
  const [validation, setValidation] = useState<string | null>(null);
  const permissions = directory.permissions.filter(
    (item) =>
      item.module === (scope === "organization" ? "actividades" : module),
  );
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const input = readForm(event.currentTarget);
    const values = permissions.flatMap((permission) =>
      input[permission.id] === "inherit"
        ? []
        : [
            {
              permission_id: permission.id,
              allowed: input[permission.id] === "allow",
            },
          ],
    );
    const parsed = parseForm(grantSchema, {
      ...input,
      member_id: user.member.id,
      scope,
      company_id: scope === "organization" ? null : input.company_id,
      module: scope === "organization" ? "actividades" : module,
      active: input.active === "on",
      overrides: values,
      ...(grant ? { id: grant.id, expected_revision: grant.revision } : {}),
    });
    setValidation(parsed.error);
    if (parsed.data && (await command.submit("AssignAccess", parsed.data)))
      onSaved();
  }
  function changeModule(value: string) {
    const selected = DOCUMENT_MODULES.find((item) => item.id === value);
    if (selected) setModule(selected.id);
  }
  return (
    <form
      className="space-y-5 rounded-xl border border-zinc-200 bg-white p-5"
      onSubmit={submit}
    >
      <h3 className="font-semibold">
        {grant ? "Editar asignación" : "Nueva asignación"}
      </h3>
      <GrantContextFields
        user={user}
        directory={directory}
        grant={grant}
        companies={context.companies}
        scope={scope}
        module={module}
        onScope={setScope}
        onModule={changeModule}
        disabled={command.busy}
      />
      <GrantOverrides
        permissions={permissions}
        overrides={overrides}
        grant={grant}
        memberType={user.member.member_type}
        disabled={command.busy}
      />
      <FormActions
        busy={command.busy}
        error={validation ?? command.error}
        label="Guardar asignación"
        loadingText="Guardando permisos…"
        onCancel={onCancel}
      />
    </form>
  );
}

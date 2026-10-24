"use client";

import { useState } from "react";

import { CheckboxField } from "@/components/molecules/checkbox-field";
import { SelectField } from "@/components/molecules/select-field";
import { FormActions } from "@/features/access/components/form-actions";
import { LifecycleControl } from "@/features/access/components/lifecycle-control";
import { useCommand } from "@/features/access/hooks/use-command";
import type {
  SubmitEvent,
  UserDetailProps,
} from "@/features/access/types/access-ui.types";
import { readForm } from "@/features/access/utils/form-data";

export function MembershipForm({ user, onChanged }: UserDetailProps) {
  const command = useCommand();
  const [memberType, setMemberType] = useState(user.member.member_type);
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const input = readForm(event.currentTarget);
    if (
      await command.submit("SaveMembership", {
        id: user.member.id,
        expected_revision: user.member.revision,
        member_type: memberType,
        is_admin: memberType === "internal" && input.is_admin === "on",
        active: input.active === "on",
      })
    )
      onChanged();
  }
  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
      <h3 className="font-medium">Membresía del estudio</h3>
      {!user.member.deleted_at && (
        <form className="space-y-4" onSubmit={submit}>
          <fieldset
            className="flex flex-wrap items-end gap-5"
            disabled={command.busy}
          >
            <SelectField
              id="edit-member-type"
              label="Tipo"
              onChange={(event) => setMemberType(event.target.value)}
              value={memberType}
            >
              <option value="internal">Equipo interno</option>
              <option value="client">Cliente</option>
            </SelectField>
            <CheckboxField
              defaultChecked={user.member.active}
              id="member-active"
              label="Membresía activa"
              name="active"
            />
            {memberType === "internal" && (
              <CheckboxField
                defaultChecked={user.member.is_admin}
                id="member-admin"
                label="Administrador"
                name="is_admin"
              />
            )}
          </fieldset>
          <FormActions
            busy={command.busy}
            error={command.error}
            label="Guardar membresía"
            loadingText="Actualizando membresía…"
          />
        </form>
      )}
      <div className="flex flex-wrap gap-3">
        <LifecycleControl
          deleted={Boolean(user.member.deleted_at)}
          entity="organization_members"
          label={
            user.member.deleted_at
              ? "Restaurar membresía"
              : "Eliminar membresía"
          }
          id={user.member.id}
          onChanged={onChanged}
          revision={user.member.revision}
        />
        <LifecycleControl
          deleted={Boolean(user.profile.deleted_at)}
          entity="profiles"
          label={
            user.profile.deleted_at ? "Restaurar perfil" : "Eliminar perfil"
          }
          id={user.profile.user_id}
          onChanged={onChanged}
          revision={user.profile.revision}
        />
      </div>
      <p className="text-xs text-zinc-500">
        El perfil global solo puede eliminarse cuando no mantenga membresías
        vigentes.
      </p>
    </section>
  );
}

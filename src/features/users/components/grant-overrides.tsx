import { SelectField } from "@/components/molecules/select-field";
import { REVIEW_ACTIONS } from "@/domain/access/constants/access";
import { ACTION_LABELS } from "@/domain/access/constants/action-labels";
import type { GrantOverridesProps } from "@/features/users/types/grant-ui.types";

export function GrantOverrides({
  permissions,
  overrides,
  grant,
  memberType,
  disabled,
}: GrantOverridesProps) {
  return (
    <details className="rounded-lg border border-zinc-200 p-4">
      <summary className="min-h-11 cursor-pointer text-sm font-medium">
        Excepciones por acción
      </summary>
      <p className="my-3 text-xs leading-6 text-zinc-500">
        Heredar utiliza el rol. Una excepción explícita prevalece sobre él.
      </p>
      <fieldset className="grid gap-3 sm:grid-cols-2" disabled={disabled}>
        {permissions.map((permission) => {
          const override = overrides.find(
            (item) =>
              item.grant_id === grant?.id &&
              item.permission_id === permission.id &&
              !item.deleted_at,
          );
          const reviewBlocked =
            memberType === "client" &&
            REVIEW_ACTIONS.some((action) => action === permission.action);
          return (
            <SelectField
              defaultValue={
                override ? (override.allowed ? "allow" : "deny") : "inherit"
              }
              id={`override-${permission.id}`}
              key={permission.id}
              label={ACTION_LABELS[permission.action] ?? permission.action}
              name={permission.id}
            >
              <option value="inherit">Heredar del rol</option>
              {!reviewBlocked && <option value="allow">Permitir</option>}
              <option value="deny">Denegar</option>
            </SelectField>
          );
        })}
      </fieldset>
    </details>
  );
}

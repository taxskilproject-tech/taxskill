import { CheckboxField } from "@/components/molecules/checkbox-field";
import { SelectField } from "@/components/molecules/select-field";
import { DOCUMENT_MODULES } from "@/domain/common/constants/modules";
import type { GrantContextFieldsProps } from "@/features/users/types/grant-ui.types";

export function GrantContextFields({
  user,
  directory,
  grant,
  companies,
  scope,
  module,
  onScope,
  onModule,
  disabled,
}: GrantContextFieldsProps) {
  const roles = directory.roles.filter(
    (role) =>
      role.audience === user.member.member_type &&
      role.active &&
      !role.deleted_at,
  );
  return (
    <fieldset className="grid gap-4 sm:grid-cols-2" disabled={disabled}>
      <SelectField
        id="grant-scope"
        label="Alcance"
        onChange={(event) => onScope(event.target.value)}
        value={scope}
      >
        <option value="company">Empresa</option>
        {user.member.member_type === "internal" && (
          <option value="organization">Actividades internas del estudio</option>
        )}
      </SelectField>
      {scope === "company" && (
        <SelectField
          defaultValue={grant?.company_id ?? ""}
          id="grant-company"
          label="Empresa"
          name="company_id"
          required
        >
          <option value="">Seleccionar empresa</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.legal_name}
            </option>
          ))}
        </SelectField>
      )}
      {scope === "company" && (
        <SelectField
          id="grant-module"
          label="Módulo"
          onChange={(event) => onModule(event.target.value)}
          value={module}
        >
          {DOCUMENT_MODULES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </SelectField>
      )}
      <SelectField
        defaultValue={grant?.role_id}
        id="grant-role"
        label="Rol"
        name="role_id"
        required
      >
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </SelectField>
      <CheckboxField
        defaultChecked={grant?.active ?? true}
        id="grant-active"
        label="Asignación activa"
        name="active"
      />
    </fieldset>
  );
}

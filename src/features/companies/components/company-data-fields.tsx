import { FormField } from "@/components/molecules/form-field";
import { SelectField } from "@/components/molecules/select-field";
import { eligibleInternalProfiles } from "@/domain/access/utils/eligible-responsibles";
import { getLimaDate } from "@/domain/time/utils/instant";
import { CompanyContactFields } from "@/features/companies/components/company-contact-fields";
import type { CompanyDataFieldsProps } from "@/features/companies/types/company-setup.types";

export function CompanyDataFields({
  company,
  directory,
  hideRegime,
}: CompanyDataFieldsProps) {
  const eligible = eligibleInternalProfiles(directory);
  const today = getLimaDate(new Date());
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        defaultValue={company?.ruc}
        id="ruc"
        inputMode="numeric"
        label="RUC"
        maxLength={11}
        minLength={11}
        name="ruc"
        pattern="[0-9]{11}"
        required
      />
      <FormField
        defaultValue={company?.legal_name}
        id="legal-name"
        label="Razón social"
        maxLength={200}
        name="legal_name"
        required
      />
      <CompanyContactFields company={company} hideRegime={hideRegime} />
      <FormField
        defaultValue={
          company?.control_start_date ?? (today.ok ? today.data : "")
        }
        id="control-start"
        label="Inicio de control"
        name="control_start_date"
        required
        type="date"
      />
      <SelectField
        defaultValue={company?.status ?? "active"}
        id="status"
        label="Estado"
        name="status"
      >
        <option value="active">Activa</option>
        <option value="inactive">Inactiva</option>
        <option value="suspended">Suspendida</option>
      </SelectField>
      <SelectField
        defaultValue={company?.accountant_id ?? ""}
        id="accountant"
        label="Contador administrativo"
        name="accountant_id"
      >
        <option value="">Sin asignar</option>
        {eligible.map((profile) => (
          <option key={profile.user_id} value={profile.user_id}>
            {profile.full_name}
          </option>
        ))}
      </SelectField>
      <SelectField
        defaultValue={company?.supervisor_id ?? ""}
        id="supervisor"
        label="Supervisor administrativo"
        name="supervisor_id"
      >
        <option value="">Sin asignar</option>
        {eligible.map((profile) => (
          <option key={profile.user_id} value={profile.user_id}>
            {profile.full_name}
          </option>
        ))}
      </SelectField>
    </div>
  );
}

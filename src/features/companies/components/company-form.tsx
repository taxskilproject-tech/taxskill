"use client";

import { useState } from "react";

import { FormField } from "@/components/molecules/form-field";
import { SelectField } from "@/components/molecules/select-field";
import { companySchema } from "@/domain/access/contracts/access.schema";
import { eligibleInternalProfiles } from "@/domain/access/utils/eligible-responsibles";
import { getLimaDate } from "@/domain/time/utils/instant";
import { FormActions } from "@/features/access/components/form-actions";
import { useCommand } from "@/features/access/hooks/use-command";
import type {
  CompanyFormProps,
  SubmitEvent,
} from "@/features/access/types/access-ui.types";
import {
  nullableId,
  parseForm,
  readForm,
} from "@/features/access/utils/form-data";
import { CompanyContactFields } from "@/features/companies/components/company-contact-fields";

export function CompanyForm({
  company,
  directory,
  onSaved,
  onCancel,
}: CompanyFormProps) {
  const command = useCommand();
  const [validation, setValidation] = useState<string | null>(null);
  const eligible = eligibleInternalProfiles(directory);
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const input = readForm(event.currentTarget);
    const parsed = parseForm(companySchema, {
      ...input,
      accountant_id: nullableId(input.accountant_id),
      supervisor_id: nullableId(input.supervisor_id),
      ...(company
        ? { id: company.id, expected_revision: company.revision }
        : {}),
    });
    setValidation(parsed.error);
    if (
      parsed.data &&
      (await command.submit("CreateOrUpdateCompany", parsed.data))
    )
      onSaved();
  }
  const today = getLimaDate(new Date());
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-7">
      <h2 className="mb-6 text-lg font-semibold">
        {company ? "Editar empresa" : "Nueva empresa"}
      </h2>
      <form className="space-y-6" onSubmit={submit}>
        <fieldset className="grid gap-4 sm:grid-cols-2" disabled={command.busy}>
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
          <CompanyContactFields company={company} />
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
        </fieldset>
        <FormActions
          busy={command.busy}
          error={validation ?? command.error}
          label={company ? "Guardar empresa" : "Crear empresa"}
          loadingText="Guardando empresa…"
          onCancel={onCancel}
        />
      </form>
    </section>
  );
}

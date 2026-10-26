"use client";

import { useState } from "react";

import { companySchema } from "@/domain/access/contracts/access.schema";
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
import { CompanyDataFields } from "@/features/companies/components/company-data-fields";

export function LegacyCompanyForm({
  company,
  directory,
  onSaved,
  onCancel,
}: CompanyFormProps) {
  const command = useCommand();
  const [validation, setValidation] = useState<string | null>(null);
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
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-7">
      <h2 className="mb-6 text-lg font-semibold">
        {company ? "Editar empresa" : "Nueva empresa"}
      </h2>
      <form className="space-y-6" onSubmit={submit}>
        <fieldset className="grid gap-4 sm:grid-cols-2" disabled={command.busy}>
          <CompanyDataFields company={company} directory={directory} />
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

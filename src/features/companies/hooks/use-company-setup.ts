import { useRef, useState } from "react";

import { TAX_REGIMES } from "@/domain/company-profile/constants/regimes";
import { documentaryProfileSchema } from "@/domain/company-profile/contracts/profile.schema";
import {
  emptyChecklist,
  parseChecklist,
} from "@/domain/company-profile/utils/profile";
import { deliverableTemplatesSchema } from "@/domain/documents/contracts/template.schema";
import { useCommand } from "@/features/access/hooks/use-command";
import { useFormSteps } from "@/features/access/hooks/use-form-steps";
import type {
  CompanyFormProps,
  SubmitEvent,
} from "@/features/access/types/access-ui.types";
import { nullableId, readForm } from "@/features/access/utils/form-data";
import { companySetupSchema } from "@/features/companies/contracts/company-setup.schema";
import { useDocumentQuery } from "@/features/documents/hooks/use-document-query";

export function useCompanySetup({ company, onSaved }: CompanyFormProps) {
  const initialProfile = documentaryProfileSchema.safeParse(
    company?.documentary_profile,
  );
  const [checklist, setChecklist] = useState(
    initialProfile.success ? initialProfile.data : emptyChecklist(),
  );
  const [regime, setRegime] = useState(company?.tax_regime_code ?? "");
  const [validation, setValidation] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const steps = useFormSteps(form, 3);
  const templates = useDocumentQuery(
    "deliverable_templates",
    {},
    deliverableTemplatesSchema,
  );
  const selected = templates.data?.rows.find(
    (item) => item.regime_code === regime,
  );
  const command = useCommand();
  const parsedChecklist = parseChecklist(checklist);
  const profileChanged =
    Boolean(company) &&
    (company?.tax_regime_code !== regime ||
      !initialProfile.success ||
      !parsedChecklist.success ||
      JSON.stringify(initialProfile.data) !==
        JSON.stringify(parsedChecklist.data));
  function next() {
    if (steps.step === 1) {
      const profile = parseChecklist(checklist);
      if (!profile.success) {
        setValidation(
          profile.error.issues.map((issue) => issue.message).join(" · "),
        );
        return;
      }
      if (!regime) {
        setValidation("Selecciona un régimen o categoría tributaria.");
        return;
      }
    }
    setValidation(null);
    steps.next();
  }
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (steps.step < 2) {
      next();
      return;
    }
    if (!steps.validate()) return;
    const input = readForm(event.currentTarget);
    const profile = parseChecklist(checklist);
    if (!profile.success) {
      setValidation(
        profile.error.issues.map((issue) => issue.message).join(" · "),
      );
      steps.select(1);
      return;
    }
    const unchanged = Boolean(company) && !profileChanged;
    const parsed = companySetupSchema.safeParse({
      ...input,
      tax_regime_code: regime,
      tax_regime: TAX_REGIMES.find((item) => item.code === regime)?.label,
      documentary_profile: profile.data,
      document_template_version_id: unchanged
        ? company?.document_template_version_id
        : selected?.published?.id,
      accountant_id: nullableId(input.accountant_id),
      supervisor_id: nullableId(input.supervisor_id),
      ...(company
        ? {
            id: company.id,
            expected_revision: company.revision,
            confirm_document_changes: input.confirm_document_changes === "on",
          }
        : {}),
    });
    if (!parsed.success) {
      setValidation(
        parsed.error.issues.map((issue) => issue.message).join(" · "),
      );
      return;
    }
    setValidation(null);
    if (await command.submit("CreateOrUpdateCompany", parsed.data)) onSaved();
  }
  return {
    form,
    steps,
    next,
    submit,
    command,
    validation,
    checklist,
    setChecklist,
    regime,
    setRegime,
    templates,
    selected,
    profileChanged,
  };
}

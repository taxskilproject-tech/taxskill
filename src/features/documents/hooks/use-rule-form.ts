"use client";
import { useRef, useState } from "react";
import { z } from "zod";

import { catalogRowSchema } from "@/domain/documents/contracts/document.schema";
import type {
  DocumentModule,
  Frequency,
} from "@/domain/documents/types/engine.types";
import { useFormSteps } from "@/features/access/hooks/use-form-steps";
import type { SubmitEvent } from "@/features/access/types/access-ui.types";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { useDocumentCommand } from "@/features/documents/hooks/use-document-command";
import { useDocumentQuery } from "@/features/documents/hooks/use-document-query";
import type { RuleFormProps } from "@/features/documents/types/document-ui.types";
import { parseRequirementForm } from "@/features/documents/utils/requirement-input";

const catalogSchema = z.object({
  rows: z.array(catalogRowSchema),
  count: z.number(),
});
export function useRuleForm({
  onSaved,
  rule,
  initialCompanyId,
  initialModule,
}: RuleFormProps) {
  const { context } = useWorkspace();
  const form = useRef<HTMLFormElement>(null);
  const [page, setPage] = useState(1);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [companyId, setCompanyId] = useState(
    rule?.company_id ?? initialCompanyId ?? "",
  );
  const [module, setModule] = useState<DocumentModule>(
    rule?.module ?? initialModule ?? "tributario",
  );
  const [frequency, setFrequency] = useState<Frequency>(
    rule?.configuration.frequency ?? "mensual",
  );
  const [maximum, setMaximum] = useState(
    rule?.configuration.max_file_bytes ??
      context.organization.settings.default_max_file_bytes,
  );
  const [validation, setValidation] = useState<string | null>(null);
  const catalog = useDocumentQuery(
    "catalog",
    {
      page,
      q: catalogQuery,
      active: true,
      module: rule?.module ?? initialModule,
    },
    catalogSchema,
  );
  const command = useDocumentCommand();
  const steps = useFormSteps(form, 4);
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (steps.step < 3) {
      steps.next();
      return;
    }
    if (!steps.validate()) return;
    const parsed = parseRequirementForm(
      new FormData(event.currentTarget),
      maximum,
      rule,
    );
    setValidation(
      parsed.success
        ? null
        : parsed.error.issues.map((issue) => issue.message).join(" · "),
    );
    if (
      parsed.success &&
      (await command.submit("ConfigureRequirement", parsed.data))
    )
      onSaved();
  }
  return {
    form,
    page,
    setPage,
    companyId,
    setCompanyId,
    module,
    setModule,
    frequency,
    setFrequency,
    maximum,
    setMaximum,
    validation,
    catalog,
    searchCatalog: (query: string) => {
      setCatalogQuery(query);
      setPage(1);
    },
    command,
    steps,
    submit,
  };
}

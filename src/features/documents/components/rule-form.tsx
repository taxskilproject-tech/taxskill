"use client";
import { useRef, useState } from "react";
import { z } from "zod";

import { catalogRowSchema } from "@/domain/documents/contracts/document.schema";
import type {
  DocumentModule,
  Frequency,
} from "@/domain/documents/types/engine.types";
import { FormActions } from "@/features/access/components/form-actions";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import type { SubmitEvent } from "@/features/access/types/access-ui.types";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { RecurrenceFields } from "@/features/documents/components/recurrence-fields";
import { RuleConditionsFields } from "@/features/documents/components/rule-conditions-fields";
import { RuleDestinationFields } from "@/features/documents/components/rule-destination-fields";
import { RuleMetadataFields } from "@/features/documents/components/rule-metadata-fields";
import { RulePreview } from "@/features/documents/components/rule-preview";
import { RuleResponsibilityFields } from "@/features/documents/components/rule-responsibility-fields";
import { RuleSlots } from "@/features/documents/components/rule-slots";
import { useDocumentCommand } from "@/features/documents/hooks/use-document-command";
import { useDocumentQuery } from "@/features/documents/hooks/use-document-query";
import type { RuleFormProps } from "@/features/documents/types/document-ui.types";
import { parseRequirementForm } from "@/features/documents/utils/requirement-input";

const catalogSchema = z.object({
  rows: z.array(catalogRowSchema),
  count: z.number(),
});
export function RuleForm({ onSaved, rule }: RuleFormProps) {
  const { context } = useWorkspace();
  const form = useRef<HTMLFormElement>(null);
  const [page, setPage] = useState(1);
  const [companyId, setCompanyId] = useState(rule?.company_id ?? "");
  const [module, setModule] = useState<DocumentModule>(
    rule?.module ?? "tributario",
  );
  const [frequency, setFrequency] = useState<Frequency>(
    rule?.configuration.frequency ?? "mensual",
  );
  const [maximum, setMaximum] = useState(
    rule?.configuration.max_file_bytes ??
      context.organization.settings.default_max_file_bytes,
  );
  const [validation, setValidation] = useState<string | null>(null);
  const catalog = useDocumentQuery("catalog", { page }, catalogSchema);
  const command = useDocumentCommand();
  async function submit(event: SubmitEvent) {
    event.preventDefault();
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
  return (
    <form
      className="space-y-5 rounded-xl border border-zinc-200 bg-white p-5"
      onSubmit={submit}
      ref={form}
    >
      <h2 className="text-lg font-semibold">
        {rule ? "Crear nueva versión de la regla" : "Nueva regla documental"}
      </h2>
      <QueryState
        error={catalog.error}
        loading={catalog.isPending}
        onRetry={() => {
          void catalog.refetch();
        }}
        retrying={catalog.isFetching}
      >
        <fieldset className="space-y-6" disabled={command.busy}>
          <input name="module" type="hidden" value={module} />
          <RuleDestinationFields
            catalog={catalog.data?.rows ?? []}
            companyId={companyId}
            onCompany={setCompanyId}
            onModule={setModule}
            rule={rule}
          />
          <Pagination
            count={catalog.data?.count ?? 0}
            onPage={setPage}
            page={page}
          />
          <RuleMetadataFields
            maximum={maximum}
            onMaximum={setMaximum}
            rule={rule}
          />
          <RecurrenceFields
            configuration={rule?.configuration}
            frequency={frequency}
            onFrequency={setFrequency}
          />
          <RuleConditionsFields
            configuration={rule?.configuration}
            frequency={frequency}
            key={`${module}:${frequency}`}
            module={module}
          />
          <RuleResponsibilityFields
            companyId={companyId}
            module={module}
            rule={rule}
          />
          <RuleSlots
            maximum={maximum}
            slots={rule?.configuration.deliverable_specs}
          />
          <RulePreview form={form} key={frequency} />
        </fieldset>
      </QueryState>
      <FormActions
        busy={command.busy}
        disabled={!catalog.data?.rows.length}
        error={validation ?? command.error}
        label={rule ? "Guardar nueva versión" : "Guardar regla"}
        onCancel={onSaved}
      />
    </form>
  );
}

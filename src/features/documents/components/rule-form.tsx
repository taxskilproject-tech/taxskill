"use client";

import { FormActions } from "@/features/access/components/form-actions";
import { FormSteps } from "@/features/access/components/form-steps";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { DraftSummary } from "@/features/documents/components/draft-summary";
import { RecurrenceFields } from "@/features/documents/components/recurrence-fields";
import { RuleConditionsFields } from "@/features/documents/components/rule-conditions-fields";
import { RuleDestinationFields } from "@/features/documents/components/rule-destination-fields";
import { RuleMetadataFields } from "@/features/documents/components/rule-metadata-fields";
import { RulePreview } from "@/features/documents/components/rule-preview";
import { RuleResponsibilityFields } from "@/features/documents/components/rule-responsibility-fields";
import { RuleSlots } from "@/features/documents/components/rule-slots";
import { useRuleForm } from "@/features/documents/hooks/use-rule-form";
import type { RuleFormProps } from "@/features/documents/types/document-ui.types";

export function RuleForm({ onSaved, rule }: RuleFormProps) {
  const {
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
    command,
    steps,
    submit,
  } = useRuleForm({ onSaved, rule });
  return (
    <form
      className="space-y-5 rounded-xl border border-zinc-200 bg-white p-5"
      noValidate
      onSubmit={submit}
      ref={form}
    >
      <h2 className="text-lg font-semibold">
        {rule ? "Crear nueva versión de la regla" : "Nueva regla documental"}
      </h2>
      <FormSteps
        busy={command.busy}
        labels={[
          "Contexto",
          "Periodicidad",
          "Archivos",
          "Responsables y resumen",
        ]}
        step={steps.step}
        onSelect={steps.select}
        onNext={steps.next}
        onBack={steps.back}
      />
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
          <div
            data-form-step="0"
            hidden={steps.step !== 0}
            className="space-y-4"
          >
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
          </div>
          <div
            data-form-step="1"
            hidden={steps.step !== 1}
            className="space-y-4"
          >
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
          </div>
          <div
            data-form-step="2"
            hidden={steps.step !== 2}
            className="space-y-4"
          >
            <RuleSlots
              maximum={maximum}
              slots={rule?.configuration.deliverable_specs}
            />
          </div>
          <div
            data-form-step="3"
            hidden={steps.step !== 3}
            className="space-y-4"
          >
            <DraftSummary data={steps.summary} />
            <RuleResponsibilityFields
              companyId={companyId}
              module={module}
              rule={rule}
            />
            <RulePreview form={form} key={frequency} />
          </div>
        </fieldset>
      </QueryState>
      <div hidden={steps.step !== 3}>
        <FormActions
          busy={command.busy}
          disabled={!catalog.data?.rows.length}
          error={validation ?? command.error}
          label={rule ? "Guardar nueva versión" : "Guardar regla"}
          onCancel={onSaved}
        />
      </div>
    </form>
  );
}

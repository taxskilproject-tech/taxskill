"use client";
import { CheckboxField } from "@/components/molecules/checkbox-field";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { FormActions } from "@/features/access/components/form-actions";
import { FormSteps } from "@/features/access/components/form-steps";
import { QueryState } from "@/features/access/components/query-state";
import type { CompanyFormProps } from "@/features/access/types/access-ui.types";
import { CompanyCurrentDeliverables } from "@/features/companies/components/company-current-deliverables";
import { CompanyDataFields } from "@/features/companies/components/company-data-fields";
import { CompanyProfileChanges } from "@/features/companies/components/company-profile-changes";
import { CompanySetupStep } from "@/features/companies/components/company-setup-step";
import { CompanySetupSummary } from "@/features/companies/components/company-setup-summary";
import { useCompanySetup } from "@/features/companies/hooks/use-company-setup";

export function CompanySetupForm(props: CompanyFormProps) {
  const {
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
  } = useCompanySetup(props);
  return (
    <form ref={form} onSubmit={submit} noValidate className="space-y-4">
      <h2 className="text-lg font-semibold">
        {props.company ? "Editar empresa y perfil documental" : "Nueva empresa"}
      </h2>
      <FormSteps
        labels={["Datos", "Módulos y cobertura", "Resumen de entregables"]}
        step={steps.step}
        onBack={steps.back}
        onNext={next}
        onSelect={steps.select}
        busy={command.busy}
      />
      <fieldset disabled={command.busy} className="space-y-4">
        <div data-form-step="0" hidden={steps.step !== 0}>
          <CompanyDataFields
            company={props.company}
            directory={props.directory}
            hideRegime
          />
        </div>
        <div data-form-step="1" hidden={steps.step !== 1}>
          <CompanySetupStep
            regime={regime}
            onRegime={setRegime}
            checklist={checklist}
            onChecklist={setChecklist}
          />
        </div>
        <div data-form-step="2" hidden={steps.step !== 2} className="space-y-3">
          <QueryState
            loading={templates.isPending}
            error={templates.error}
            retrying={templates.isFetching}
            onRetry={() => {
              void templates.refetch();
            }}
          >
            {props.company && !profileChanged ? (
              <CompanyCurrentDeliverables companyId={props.company.id} />
            ) : (
              <CompanySetupSummary
                company={props.company}
                form={form}
                items={selected?.published?.items ?? null}
                version={selected?.published?.version_number ?? null}
                profile={checklist}
                refreshing={templates.isFetching}
                onRefresh={() => {
                  void templates.refetch();
                }}
              />
            )}
          </QueryState>
          {props.company && profileChanged && (
            <>
              <CompanyProfileChanges
                companyId={props.company.id}
                items={selected?.published?.items ?? []}
                profile={checklist}
              />
              <CheckboxField
                id="confirm-document-changes"
                name="confirm_document_changes"
                label="Confirmo los cambios de perfil mostrados. Se conservan los archivos y obligaciones ya emitidos."
              />
            </>
          )}
        </div>
      </fieldset>
      {validation && (
        <FeedbackMessage kind="error">{validation}</FeedbackMessage>
      )}
      {steps.step === 2 && (
        <FormActions
          busy={command.busy}
          error={command.error}
          disabled={
            ((!props.company || profileChanged) && !selected?.published) ||
            templates.isFetching
          }
          label={
            props.company
              ? "Guardar cambios confirmados"
              : "Crear empresa y preparar entregables"
          }
          loadingText="Preparando empresa y entregables…"
          onCancel={props.onCancel}
        />
      )}
    </form>
  );
}

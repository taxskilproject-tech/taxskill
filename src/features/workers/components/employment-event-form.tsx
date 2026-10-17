"use client";
import { useState } from "react";

import { FormField } from "@/components/molecules/form-field";
import { SelectField } from "@/components/molecules/select-field";
import { eventRulesSchema } from "@/domain/workers/contracts/worker.schema";
import { FormActions } from "@/features/access/components/form-actions";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import type { SubmitEvent } from "@/features/access/types/access-ui.types";
import { GenerationResult } from "@/features/documents/components/generation-result";
import { useWorkerCommand } from "@/features/workers/hooks/use-worker-command";
import { useWorkerQuery } from "@/features/workers/hooks/use-worker-query";
import type { GenerationProgressProps } from "@/features/workers/types/worker-ui.types";

export function EmploymentEventForm({
  detail,
  canManage,
}: GenerationProgressProps) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState("");
  const [eventId, setEventId] = useState<string | null>(null);
  const stage = detail.selected_period;
  const query = useWorkerQuery(
    "event_rules",
    {
      company_id: detail.worker.company_id,
      worker_id: detail.worker.id,
      employment_period_id: stage?.id,
      page,
    },
    eventRulesSchema,
    Boolean(stage && canManage && !detail.worker.deleted_at),
  );
  const action = useWorkerCommand();
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!stage) return;
    const data = new FormData(event.currentTarget);
    const id = eventId ?? crypto.randomUUID();
    setEventId(id);
    if (
      await action.submit("EmitEmploymentRequest", {
        company_id: detail.worker.company_id,
        worker_id: detail.worker.id,
        employment_period_id: stage.id,
        expected_revision: stage.revision,
        rule_id: data.get("rule_id"),
        reference_date: data.get("reference_date"),
        event_id: id,
      })
    )
      setEventId(null);
  }
  if (
    !stage ||
    !canManage ||
    detail.worker.deleted_at ||
    detail.company_status !== "active"
  )
    return null;
  return (
    <details className="rounded-xl border border-zinc-200 bg-white p-5">
      <summary className="cursor-pointer text-sm font-medium">
        Registrar memorándum, adenda u otra solicitud configurada
      </summary>
      <QueryState
        error={query.error}
        loading={query.isPending}
        onRetry={() => {
          void query.refetch();
        }}
        retrying={query.isFetching}
      >
        {query.data?.count === 0 ? (
          <p className="mt-4 text-sm text-zinc-600">
            El administrador debe configurar una regla eventual con solicitudes
            manuales para esta etapa.
          </p>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={submit}>
            <fieldset className="space-y-4" disabled={action.busy}>
              <SelectField
                id="employment-event-rule"
                label="Regla documental"
                name="rule_id"
                onChange={(event) => setSelected(event.target.value)}
                required
                value={selected}
              >
                <option value="">Seleccionar regla</option>
                {selected &&
                  !query.data?.rows.some((rule) => rule.id === selected) && (
                    <option value={selected}>Regla seleccionada</option>
                  )}
                {query.data?.rows.map((rule) => (
                  <option key={rule.id} value={rule.id}>
                    {rule.title}
                  </option>
                ))}
              </SelectField>
              <Pagination
                count={query.data?.count ?? 0}
                onPage={setPage}
                page={page}
              />
              <FormField
                hint="Debe pertenecer a la etapa y al intervalo de control de la regla."
                id="employment-event-date"
                label="Fecha de referencia del evento"
                name="reference_date"
                required
                type="date"
              />
            </fieldset>
            <FormActions
              busy={action.busy}
              error={action.error}
              label="Crear obligación del evento"
              loadingText="Registrando evento laboral…"
            />
            <GenerationResult result={action.result} />
          </form>
        )}
      </QueryState>
    </details>
  );
}

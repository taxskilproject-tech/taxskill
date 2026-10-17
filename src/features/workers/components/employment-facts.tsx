import { Badge } from "@/components/atoms/badge";
import { TERMINATION_LABELS } from "@/domain/workers/constants/workers";
import type { EmploymentFactsProps } from "@/features/workers/types/worker-ui.types";

export function EmploymentFacts({ stage }: EmploymentFactsProps) {
  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Etapa {stage.sequence_number}</h2>
        <Badge>{stage.end_date ? "Cesada" : "Activa"}</Badge>
      </div>
      <dl className="grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-zinc-500">Ingreso</dt>
          <dd className="mt-1">{stage.start_date}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Cese</dt>
          <dd className="mt-1">{stage.end_date ?? "Relación abierta"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Motivo</dt>
          <dd className="mt-1">
            {stage.termination_reason
              ? TERMINATION_LABELS[stage.termination_reason]
              : "Sin cese"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Cargo</dt>
          <dd className="mt-1">{stage.position ?? "Sin informar"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Área</dt>
          <dd className="mt-1">{stage.department ?? "Sin informar"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Contrato</dt>
          <dd className="mt-1">{stage.contract_type ?? "Sin informar"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Remuneración de referencia</dt>
          <dd className="mt-1">
            {stage.reference_salary === null
              ? "Sin informar"
              : `${stage.reference_salary} ${stage.currency}`}
          </dd>
        </div>
      </dl>
      {stage.termination_notes && (
        <p className="text-sm text-zinc-600">
          Observación del cese: {stage.termination_notes}
        </p>
      )}
    </section>
  );
}

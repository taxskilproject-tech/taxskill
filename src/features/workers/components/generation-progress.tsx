"use client";
import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { useWorkerCommand } from "@/features/workers/hooks/use-worker-command";
import type { GenerationProgressProps } from "@/features/workers/types/worker-ui.types";

export function GenerationProgress({
  detail,
  canManage,
}: GenerationProgressProps) {
  const action = useWorkerCommand();
  const stage = detail.selected_period;
  if (!stage) return null;
  const phases = [
    { label: "Ingreso", phase: stage.document_generation.hire },
    { label: "Cese", phase: stage.document_generation.termination },
    { label: "Actualización", phase: stage.document_generation.reconcile },
  ];
  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="font-semibold">Generación documental</h2>
      {phases
        .filter((item) => item.phase)
        .map(({ label, phase }) => (
          <p className="text-sm text-zinc-600" key={label}>
            {label}:{" "}
            {phase?.status === "completed"
              ? "completada"
              : phase?.status === "skipped"
                ? "histórico anterior al control"
                : phase?.status === "failed"
                  ? "pendiente de reintento"
                  : "pendiente"}{" "}
            · {phase?.generated_count ?? 0} obligaciones nuevas.
            {phase?.last_error
              ? " La etapa está guardada; se conserva el avance para reintentar."
              : ""}
          </p>
        ))}
      {canManage &&
        !detail.worker.deleted_at &&
        detail.company_status === "active" && (
          <Button
            loading={action.busy}
            loadingText="Actualizando obligaciones…"
            onClick={() => {
              void action.submit("ReconcileEmployment", {
                company_id: detail.worker.company_id,
                worker_id: detail.worker.id,
                employment_period_id: stage.id,
                expected_revision: stage.revision,
              });
            }}
            variant="secondary"
          >
            Actualizar obligaciones vigentes y reintentar pendientes
          </Button>
        )}
      {action.error && (
        <FeedbackMessage kind="error">{action.error}</FeedbackMessage>
      )}
      {action.result && (
        <p className="text-sm text-zinc-600" role="status">
          {action.result.status === "pending"
            ? "Avance guardado; continúa por lotes."
            : "Obligaciones actualizadas."}
        </p>
      )}
    </section>
  );
}

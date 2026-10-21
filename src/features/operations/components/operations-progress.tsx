import { formatLimaDateTime } from "@/domain/time/utils/instant";
import type { OperationsStatusProps } from "@/features/operations/types/operations.types";

function progressInstant(value: string | null): string {
  if (!value) return "Sin avance registrado";
  const formatted = formatLimaDateTime(value);
  return formatted.ok ? `${formatted.data} (Lima)` : "Fecha no disponible";
}

export function OperationsProgress({ snapshot }: OperationsStatusProps) {
  const processes = [
    {
      name: "Generación documental",
      progress: snapshot.generation_last_progress_at,
      pending: snapshot.generation_pending_since,
    },
    {
      name: "Barrido de avisos",
      progress: snapshot.deadline_last_progress_at,
      pending: snapshot.deadline_pending_since,
    },
    {
      name: "Preparación de resúmenes",
      progress: snapshot.digest_last_progress_at,
      pending: snapshot.digest_pending_since,
    },
  ];
  return (
    <section aria-labelledby="operation-progress" className="space-y-3">
      <h3 className="font-medium" id="operation-progress">
        Avance de los procesos
      </h3>
      <dl className="divide-y divide-zinc-200">
        {processes.map((process) => (
          <div className="space-y-1 py-3 text-sm" key={process.name}>
            <dt className="font-medium">{process.name}</dt>
            <dd>Último avance: {progressInstant(process.progress)}</dd>
            {process.pending && (
              <dd>Pendiente desde: {progressInstant(process.pending)}</dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}

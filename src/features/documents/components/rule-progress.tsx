import { normalizeOperationError } from "@/domain/common/utils/normalize-operation-error";
import { formatLimaDateTime } from "@/domain/time/utils/instant";
import type { RuleEngineProps } from "@/features/documents/types/engine-ui.types";

export function RuleProgress({ rule }: RuleEngineProps) {
  const cursor = rule.generation_cursor;
  const generated = cursor.last_generated_at
    ? formatLimaDateTime(cursor.last_generated_at)
    : null;
  return (
    <div className="space-y-2 text-sm text-zinc-600">
      {rule.configuration.frequency === "eventual" ? (
        <p>
          Generación mediante eventos identificados; no usa el calendario
          automático.
        </p>
      ) : (
        <p>
          Última ocurrencia completada:{" "}
          {cursor.last_completed_occurrence ?? "Sin generación"}.
        </p>
      )}
      {generated?.ok && <p>Último avance: {generated.data} · Lima.</p>}
      {cursor.processing_occurrence && (
        <p>
          Lote pendiente de {cursor.processing_occurrence}. Su versión permanece
          fijada hasta terminar los destinos.
        </p>
      )}
      {cursor.last_batch_count !== undefined && (
        <p>Último lote: {cursor.last_batch_count} obligaciones nuevas.</p>
      )}
      {cursor.last_error && (
        <p role="alert">
          Generación interrumpida:{" "}
          {normalizeOperationError({ code: cursor.last_error }).message} Puedes
          reintentar desde el avance guardado.
        </p>
      )}
      {cursor.warning && <p>{cursor.warning}</p>}
    </div>
  );
}

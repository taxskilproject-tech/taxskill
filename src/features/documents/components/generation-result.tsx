import Link from "next/link";

import type { GenerationResultProps } from "@/features/documents/types/engine-ui.types";

export function GenerationResult({ result }: GenerationResultProps) {
  if (!result) return null;
  return (
    <div aria-live="polite" className="space-y-2 text-sm text-zinc-700">
      {result.generated_count !== undefined && (
        <p>
          {result.generated_count} obligaciones nuevas ·{" "}
          {result.processed_count ?? 0} destinos procesados.
        </p>
      )}
      {result.has_more && (
        <p>
          Hay trabajo pendiente. Continúa el siguiente lote o deja que lo
          ejecute el generador programado.
        </p>
      )}
      {result.warning && <p>{result.warning}</p>}
      {result.obligation_id && (
        <Link
          className="inline-flex min-h-11 items-center underline underline-offset-4"
          href={`/actividades/${result.obligation_id}?returnTo=${encodeURIComponent("/configuracion?tab=reglas")}`}
        >
          Abrir obligación →
        </Link>
      )}
    </div>
  );
}

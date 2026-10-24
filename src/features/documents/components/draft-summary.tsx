import { FREQUENCY_LABELS } from "@/domain/documents/constants/engine";
import type { DraftSummaryProps } from "@/features/documents/types/draft-summary.types";
import { BYTES_PER_MB } from "@/features/documents/utils/file-size";

export function DraftSummary({ data }: DraftSummaryProps) {
  if (!data) return null;
  const frequency = String(data.get("frequency") ?? "unica");
  const count = Number(data.get("slot_count") ?? 0);
  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <h3 className="font-medium">Resumen antes de guardar</h3>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt>Título</dt>
        <dd>{String(data.get("title") ?? "")}</dd>
        <dt>Periodicidad</dt>
        <dd>{Reflect.get(FREQUENCY_LABELS, frequency) ?? frequency}</dd>
        <dt>Máximo general</dt>
        <dd>{Number(data.get("max_file_bytes") ?? 0) / BYTES_PER_MB} MB</dd>
        <dt>Archivos requeridos</dt>
        <dd>{count}</dd>
      </dl>
      <ul className="space-y-1 text-xs text-zinc-600">
        {Array.from({ length: Math.min(count, 50) }, (_, index) => (
          <li key={index}>
            {String(
              data.get(`slot_label_${index + 1}`) ?? `Archivo ${index + 1}`,
            )}{" "}
            ·{" "}
            {data
              .getAll(`slot_formats_${index + 1}`)
              .map(String)
              .join(", ")
              .toUpperCase()}
          </li>
        ))}
      </ul>
    </section>
  );
}

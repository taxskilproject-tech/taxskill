import type { VisualTone } from "@/components/types/visual.types";
import { formatCivilDate } from "@/domain/time/utils/civil-date";

export function reviewTone(state: string): VisualTone {
  if (state === "aprobado") return "success";
  if (state === "observado") return "warning";
  if (state === "por_revisar") return "blue";
  return "neutral";
}

export function displayDate(value: string | null): string {
  if (!value) return "Sin entrega pendiente";
  const formatted = formatCivilDate(value);
  return formatted.ok ? formatted.data : value;
}

export function occurrenceLabel(value: string): string {
  if (value.startsWith("event:")) return "Eventual";
  if (value.startsWith("unique:")) return "Única";
  return value;
}

import type {
  Deliverable,
  SubmissionCycle,
} from "@/domain/documents/types/document.types";
import { getLimaDate } from "@/domain/time/utils/instant";

export function aggregateReview(
  deliverables: readonly Pick<Deliverable, "review_state">[],
  disposition = "active",
) {
  if (disposition !== "active") return disposition;
  if (
    deliverables.length &&
    deliverables.every((slot) => slot.review_state === "aprobado")
  )
    return "aprobado";
  if (deliverables.some((slot) => slot.review_state === "observado"))
    return "observado";
  if (deliverables.some((slot) => slot.review_state === "pendiente"))
    return "pendiente";
  return "por_revisar";
}
export function operationalDueDate(cycles: readonly SubmissionCycle[]) {
  return (
    cycles
      .filter((cycle) => cycle.state === "open" && !cycle.first_submitted_at)
      .map((cycle) => cycle.due_date)
      .sort()[0] ?? null
  );
}
export function wasSubmittedOnTime(cycle: SubmissionCycle) {
  if (!cycle.first_submitted_at) return null;
  const date = getLimaDate(cycle.first_submitted_at);
  if (!date.ok) throw date.error;
  return date.data <= cycle.due_date;
}

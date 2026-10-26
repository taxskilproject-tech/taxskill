import type {
  DocumentPeriodObligation,
} from "@/domain/documents/types/document-workspace.types";
import { displayDate } from "@/features/documents/utils/document-presentation";

export function documentPeriodLabel(
  obligation: DocumentPeriodObligation,
): string {
  const start = displayDate(obligation.period_start);
  const end = displayDate(obligation.period_end);
  const range =
    obligation.period_start === obligation.period_end
      ? start
      : `${start} – ${end}`;
  if (obligation.period_kind === "fortnightly") {
    const half = Number(obligation.period_start.slice(8)) <= 15 ? "1.ª" : "2.ª";
    return `${half} quincena · ${range}`;
  }
  if (obligation.period_kind === "weekly") return `Semana · ${range}`;
  if (obligation.period_kind === "event") return `Eventual · ${range}`;
  if (obligation.period_kind === "unique") return `Única · ${range}`;
  return range;
}

export function documentFileDestination(
  obligationId: string,
  fileId: string,
  origin: string,
) {
  const parameters = new URLSearchParams({
    deliverableId: fileId,
    view: "entrega",
    returnTo: origin,
  });
  return `/actividades/${obligationId}?${parameters}`;
}

export function limaDocumentYear(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en", {
      year: "numeric",
      timeZone: "America/Lima",
    }).format(now),
  );
}

import Link from "next/link";

import { Badge } from "@/components/atoms/badge";
import { Icon } from "@/components/atoms/icon";
import { FOCUS_RING } from "@/components/constants/control-styles";
import { REVIEW_LABELS } from "@/domain/documents/constants/documents";
import type { DocumentFileRowProps } from "@/features/document-workspace/types/document-workspace-ui.types";
import {
  documentFileDestination,
  documentPeriodLabel,
} from "@/features/document-workspace/utils/document-period-presentation";
import {
  displayDate,
  reviewTone,
} from "@/features/documents/utils/document-presentation";

export function DocumentFileRow({
  file,
  obligation,
  origin,
  compact,
}: DocumentFileRowProps) {
  const state =
    obligation.disposition === "active"
      ? file.review_state
      : obligation.aggregate_state;
  return (
    <li
      className="flex items-center gap-3 px-3 py-2"
      value={file.display_order}
    >
      {!compact && (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-xs font-semibold text-blue-800">
          {file.display_order}
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        {compact && (
          <p className="text-xs font-medium text-slate-600">
            {documentPeriodLabel(obligation)}
            {obligation.worker_name && (
              <span className="block font-semibold text-slate-800">
                {obligation.worker_name} · Periodo laboral{" "}
                {obligation.employment_sequence}
              </span>
            )}
          </p>
        )}
        <p className="text-sm font-medium">{file.label}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
          <Badge tone={reviewTone(state)}>{REVIEW_LABELS[state]}</Badge>
          <span>
            {file.formats.join(", ").toUpperCase()} ·{" "}
            {file.due_date
              ? `Entrega hasta ${displayDate(file.due_date)}`
              : "Sin plazo registrado"}
          </span>
          {compact && obligation.overdue && (
            <span className="font-medium text-red-700">Entrega vencida</span>
          )}
          {compact && obligation.assignment_issue && (
            <span className="text-amber-800">Revisar responsable</span>
          )}
        </div>
      </div>
      <Link
        className={`inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-blue-200 px-3 text-sm font-medium text-blue-800 hover:bg-blue-50 ${FOCUS_RING}`}
        aria-label={`Abrir ${file.label} de ${obligation.title}`}
        href={documentFileDestination(obligation.id, file.id, origin)}
      >
        Abrir <Icon name="arrow" className="h-4 w-4" />
      </Link>
    </li>
  );
}

import { Badge } from "@/components/atoms/badge";
import { REVIEW_LABELS } from "@/domain/documents/constants/documents";
import { DocumentFileRow } from "@/features/document-workspace/components/document-file-row";
import type { DocumentPeriodObligationProps } from "@/features/document-workspace/types/document-workspace-ui.types";
import { documentPeriodLabel } from "@/features/document-workspace/utils/document-period-presentation";
import { reviewTone } from "@/features/documents/utils/document-presentation";

export function DocumentObligationCard({
  obligation,
  origin,
}: DocumentPeriodObligationProps) {
  const compact = obligation.files.length === 1;
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {!compact && (
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
          <div>
            {obligation.worker_name && (
              <p className="text-sm font-semibold">
                {obligation.worker_name} · Periodo laboral{" "}
                {obligation.employment_sequence}
              </p>
            )}
            <h3 className="text-sm font-semibold">
              {documentPeriodLabel(obligation)}
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">{obligation.title}</p>
          </div>
          <div className="text-right text-xs">
            <Badge tone={reviewTone(obligation.aggregate_state)}>
              {REVIEW_LABELS[obligation.aggregate_state]}
            </Badge>
            <p className="mt-1 text-slate-600">
              {obligation.approved_count}/{obligation.total_count} archivos
              aprobados
            </p>
            {obligation.overdue && (
              <p className="font-medium text-red-700">Entrega vencida</p>
            )}
            {obligation.assignment_issue && (
              <p className="text-amber-800">Revisar responsable</p>
            )}
          </div>
        </header>
      )}
      <ol
        aria-label="Archivos requeridos en orden"
        className="divide-y divide-slate-100"
      >
        {obligation.files.map((file) => (
          <DocumentFileRow
            key={file.id}
            file={file}
            obligation={obligation}
            origin={origin}
            compact={compact}
          />
        ))}
      </ol>
    </article>
  );
}

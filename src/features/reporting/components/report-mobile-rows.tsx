import Link from "next/link";

import { Badge } from "@/components/atoms/badge";
import {
  moduleLabel,
  periodLabel,
  stateLabel,
} from "@/domain/reporting/utils/report-labels";
import {
  displayDate,
  reviewTone,
} from "@/features/documents/utils/document-presentation";
import { ReportRowDetail } from "@/features/reporting/components/report-row-detail";
import type { ReportTableProps } from "@/features/reporting/types/reporting-ui.types";

export function ReportMobileRows({ rows, origin }: ReportTableProps) {
  return (
    <ul
      aria-label="Obligaciones del reporte"
      className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white lg:hidden"
    >
      {rows.map((row) => (
        <li className="px-3 py-1" key={row.id}>
          <div className="flex items-center justify-between gap-2">
            {row.record_status === "deleted" ? (
              <p className="font-medium">{row.title}</p>
            ) : (
              <Link
                className="inline-flex min-h-11 items-center text-sm font-medium hover:text-blue-800 hover:underline focus-visible:outline-2"
                href={`/actividades/${row.id}?returnTo=${encodeURIComponent(origin)}`}
              >
                {row.title}
              </Link>
            )}
            <ReportRowDetail row={row} />
          </div>
          <p className="text-xs text-slate-600">
            {row.company_name} · {moduleLabel(row.module)}
          </p>
          <p className="text-xs text-slate-600">
            {periodLabel(row.period, row.period_start)}
            {row.worker_name && ` · ${row.worker_name}`}
          </p>
          <div className="flex items-center justify-between gap-2 py-1 text-xs">
            <div>
              <Badge tone={reviewTone(row.state)}>
                {stateLabel(row.state)}
              </Badge>
              <p>
                {row.approved_count}/{row.total_count} aprobados
              </p>
            </div>
            <div className="text-right">
              {displayDate(row.operational_due_date)}
              {row.overdue && (
                <p className="font-medium text-red-700">Entrega vencida</p>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

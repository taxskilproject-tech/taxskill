import Link from "next/link";

import { Badge } from "@/components/atoms/badge";
import { ResourceState } from "@/components/organisms/resource-state";
import {
  moduleLabel,
  periodLabel,
  stateLabel,
} from "@/domain/reporting/utils/report-labels";
import {
  displayDate,
  reviewTone,
} from "@/features/documents/utils/document-presentation";
import { ReportMobileRows } from "@/features/reporting/components/report-mobile-rows";
import { ReportRowDetail } from "@/features/reporting/components/report-row-detail";
import type { ReportTableProps } from "@/features/reporting/types/reporting-ui.types";

export function ReportTable({ rows, origin }: ReportTableProps) {
  if (!rows.length)
    return (
      <ResourceState
        description="Modifica la empresa o los filtros para consultar otras obligaciones."
        kind="empty"
        title="Sin obligaciones para estos filtros"
      />
    );
  return (
    <>
      <ReportMobileRows rows={rows} origin={origin} />
      <div
        aria-label="Obligaciones del reporte"
        className="hidden rounded-xl border border-slate-200 bg-white lg:block"
      >
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Detalle por obligación. El avance cuenta archivos aprobados.
          </caption>
          <thead className="border-b border-slate-200 bg-slate-100/60 text-xs text-slate-600">
            <tr>
              {[
                "Obligación / empresa",
                "Periodo / trabajador",
                "Estado / avance",
                "Entrega hasta",
                "Detalle",
              ].map((label) => (
                <th className="px-3 py-2 font-medium" key={label} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr className="hover:bg-blue-50/30" key={row.id}>
                <td className="max-w-64 px-3 py-1 break-words">
                  {row.record_status === "deleted" ? (
                    <p className="font-medium">{row.title}</p>
                  ) : (
                    <Link
                      className="inline-flex min-h-11 items-center font-medium text-blue-800 hover:underline focus-visible:outline-2"
                      href={`/actividades/${row.id}?returnTo=${encodeURIComponent(origin)}`}
                    >
                      {row.title}
                    </Link>
                  )}
                  <p className="text-xs text-slate-600">
                    {row.company_name} · {moduleLabel(row.module)}
                  </p>
                </td>
                <td className="max-w-40 px-3 py-1 text-xs">
                  {periodLabel(row.period, row.period_start)}
                  <p className="text-slate-600">{row.worker_name}</p>
                </td>
                <td className="px-3 py-1">
                  <Badge tone={reviewTone(row.state)}>
                    {stateLabel(row.state)}
                  </Badge>
                  <p className="text-xs text-slate-600">
                    {row.approved_count}/{row.total_count} aprobados
                  </p>
                </td>
                <td className="px-3 py-1 text-xs">
                  {displayDate(row.operational_due_date)}
                  {row.overdue && (
                    <p className="font-medium text-red-700">Entrega vencida</p>
                  )}
                </td>
                <td className="px-2 py-1">
                  <ReportRowDetail row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

import Link from "next/link";

import { Badge } from "@/components/atoms/badge";
import { REVIEW_LABELS } from "@/domain/documents/constants/documents";
import type { ObligationRowsProps } from "@/features/documents/types/document-ui.types";
import {
  displayDate,
  occurrenceLabel,
  reviewTone,
} from "@/features/documents/utils/document-presentation";

export function ObligationRows({
  rows,
  origin,
  hideCompany = false,
}: ObligationRowsProps) {
  if (!rows.length) return null;
  return (
    <table className="block w-full rounded-xl border border-slate-200 bg-white text-left text-sm lg:table">
      <caption className="sr-only">
        Obligaciones del alcance seleccionado
      </caption>
      <thead className="hidden border-b border-slate-200 bg-slate-100/60 text-xs text-slate-600 lg:table-header-group">
        <tr>
          {[
            "Obligación",
            "Periodo / trabajador",
            "Estado / avance",
            "Entrega hasta",
          ].map((label) => (
            <th className="px-3 py-2 font-medium" key={label} scope="col">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="block divide-y divide-slate-100 lg:table-row-group">
        {rows.map((row) => (
          <tr
            className="grid grid-cols-2 gap-x-2 px-3 py-1 hover:bg-blue-50/30 lg:table-row lg:p-0"
            key={row.id}
          >
            <td className="col-span-2 block lg:table-cell lg:max-w-72 lg:px-3 lg:py-1">
              <Link
                className="inline-flex min-h-11 items-center font-medium text-slate-900 underline-offset-4 hover:text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600"
                href={`/actividades/${row.id}?returnTo=${encodeURIComponent(origin)}`}
              >
                {row.title}
              </Link>
              {!hideCompany && (
                <p className="text-xs text-slate-600">
                  {row.company_name ?? "Interna del estudio"}
                </p>
              )}
            </td>
            <td className="col-span-2 block text-xs text-slate-600 lg:table-cell lg:px-3 lg:py-1">
              {occurrenceLabel(row.occurrence_key)}
              {row.worker_name && (
                <span className="lg:block"> · {row.worker_name}</span>
              )}
            </td>
            <td className="block py-1 lg:table-cell lg:px-3">
              <Badge tone={reviewTone(row.aggregate_state)}>
                {REVIEW_LABELS[row.aggregate_state]}
              </Badge>
              <p className="mt-0.5 text-xs text-slate-600">
                {row.approved_count}/{row.total_count} aprobados · Prioridad{" "}
                {row.priority}
              </p>
              {row.assignment_issue && (
                <p className="text-xs text-amber-800">Revisar responsable</p>
              )}
            </td>
            <td className="block py-1 text-right text-xs lg:table-cell lg:px-3 lg:text-left">
              {displayDate(row.operational_due_date)}
              {row.overdue && (
                <p className="font-medium text-red-700">Entrega vencida</p>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

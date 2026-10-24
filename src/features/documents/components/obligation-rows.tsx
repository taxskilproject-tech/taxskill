import Link from "next/link";

import { Badge } from "@/components/atoms/badge";
import { REVIEW_LABELS } from "@/domain/documents/constants/documents";
import type { ObligationRowsProps } from "@/features/documents/types/document-ui.types";

export function ObligationRows({ rows, origin }: ObligationRowsProps) {
  if (!rows.length) return null;
  return (
    <table className="block w-full rounded-xl border border-zinc-200 bg-white text-left text-sm xl:table">
      <caption className="sr-only">
        Obligaciones del alcance seleccionado
      </caption>
      <thead className="hidden border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600 xl:table-header-group">
        <tr>
          {[
            "Obligación / empresa",
            "Periodo / trabajador",
            "Estado",
            "Entrega hasta",
            "Avance",
          ].map((label) => (
            <th className="px-3 py-2 font-medium" key={label} scope="col">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="block divide-y divide-zinc-100 xl:table-row-group">
        {rows.map((row) => (
          <tr className="block p-3 xl:table-row xl:p-0" key={row.id}>
            <td className="block xl:table-cell xl:max-w-80 xl:px-3 xl:py-2">
              <Link
                className="inline-flex min-h-11 items-center font-medium underline-offset-4 hover:underline focus-visible:outline-2"
                href={`/actividades/${row.id}?returnTo=${encodeURIComponent(origin)}`}
              >
                {row.title}
              </Link>
              <p className="text-xs text-zinc-500">
                {row.company_name ?? "Interna del estudio"} · Prioridad{" "}
                {row.priority}
              </p>
            </td>
            <td className="hidden text-xs text-zinc-600 xl:table-cell xl:px-3 xl:py-2">
              {row.occurrence_key.startsWith("event:")
                ? "Eventual"
                : row.occurrence_key.startsWith("unique:")
                  ? "Única"
                  : row.occurrence_key}
              <p>{row.worker_name}</p>
            </td>
            <td className="inline-block py-1 xl:table-cell xl:px-3 xl:py-2">
              <Badge>{REVIEW_LABELS[row.aggregate_state]}</Badge>
              {row.assignment_issue && (
                <p className="text-xs">Revisar responsable</p>
              )}
            </td>
            <td className="inline-block pl-3 text-xs xl:table-cell xl:px-3 xl:py-2">
              {row.operational_due_date ?? "Sin entrega pendiente"}
              {row.overdue && (
                <p className="font-medium text-red-700">Entrega vencida</p>
              )}
            </td>
            <td className="hidden text-xs xl:table-cell xl:px-3 xl:py-2">
              {row.approved_count}/{row.total_count} aprobados
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

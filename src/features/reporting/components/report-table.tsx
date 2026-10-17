import Link from "next/link";

import { ResourceState } from "@/components/organisms/resource-state";
import type { ReportTableProps } from "@/features/reporting/types/reporting-ui.types";

export function ReportTable({ rows, origin }: ReportTableProps) {
  if (!rows.length)
    return (
      <ResourceState
        description="Modifica el alcance o los filtros para consultar otras obligaciones."
        kind="empty"
        title="Sin obligaciones para estos filtros"
      />
    );
  return (
    <div
      aria-label="Obligaciones del reporte"
      className="overflow-x-auto rounded-xl border border-zinc-200 bg-white"
      role="region"
      tabIndex={0}
    >
      <table className="w-full min-w-240 text-left text-sm">
        <caption className="sr-only">
          Detalle por obligación. El avance cuenta archivos aprobados, no
          obligaciones.
        </caption>
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600">
          <tr>
            {[
              "Empresa / área",
              "Periodo / trabajador",
              "Obligación",
              "Estado",
              "Plazo de entrega",
              "Avance / historia",
            ].map((label) => (
              <th className="p-4 font-medium" key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="max-w-52 p-4 align-top break-words">
                <p className="font-medium">{row.company_name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {row.ruc ?? "Interna del estudio"} · {row.module}
                </p>
                <p className="mt-1 text-xs">
                  {row.class === "additional" ? "Adicional" : "Documental"} ·{" "}
                  {row.record_status === "deleted"
                    ? "Eliminado · histórico"
                    : row.record_status === "inactive"
                      ? "Inactivo · histórico"
                      : "Vigente"}
                </p>
              </td>
              <td className="max-w-48 p-4 align-top break-words">
                {row.period}
                <p className="mt-1 text-xs text-zinc-500">
                  {row.worker_name || "Sin trabajador"}
                  {row.worker_identity ? ` · ${row.worker_identity}` : ""}
                </p>
              </td>
              <td className="max-w-64 p-4 align-top break-words">
                {row.record_status === "deleted" ? (
                  row.title
                ) : (
                  <Link
                    className="underline underline-offset-4"
                    href={`/actividades/${row.id}?returnTo=${encodeURIComponent(origin)}`}
                  >
                    {row.title}
                  </Link>
                )}
                <p className="mt-1 text-xs text-zinc-500">
                  {row.document_type}
                </p>
              </td>
              <td className="p-4 align-top">
                {row.state}
                <p className="mt-1 text-xs text-zinc-500">
                  {row.required
                    ? "Exigible documental"
                    : row.class === "additional"
                      ? "Indicador adicional"
                      : "Fuera del denominador"}
                </p>
              </td>
              <td className="p-4 align-top">
                {row.operational_due_date ?? "Sin entrega pendiente"}
                {row.overdue && (
                  <p className="mt-1 font-medium">Entrega vencida</p>
                )}
                <p className="mt-1 text-xs text-zinc-500">
                  Inicial: {row.initial_due_date}
                </p>
              </td>
              <td className="p-4 align-top">
                {row.approved_count}/{row.total_count} archivos aprobados
                <p className="mt-1 text-xs text-zinc-500">
                  {row.submitted_cycles} ciclos entregados · {row.late_cycles}{" "}
                  fuera de plazo
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

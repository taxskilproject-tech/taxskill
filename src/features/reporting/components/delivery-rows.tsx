import Link from "next/link";

import { Badge } from "@/components/atoms/badge";

import type { DeliveryRowsProps } from "../types/followup-ui.types";

const REASONS: Readonly<Record<string, string>> = {
  initial: "Primera entrega",
  correction: "Corrección",
  reopen: "Reapertura",
};

export function DeliveryRows({ rows, origin }: DeliveryRowsProps) {
  return rows.map((row) => (
    <article
      key={row.id}
      className="space-y-1 rounded-lg border border-slate-200 bg-white px-3 py-2"
    >
      <Link
        className="inline-flex min-h-11 items-center font-medium text-blue-800 underline"
        href={`/actividades/${row.obligation_id}?${row.id !== row.obligation_id ? "deliverableId=" + row.id + "&" : ""}returnTo=${encodeURIComponent(origin)}`}
      >
        {row.label}
      </Link>
      <p className="text-sm">
        {row.company_name} · {row.title}
      </p>
      <p className="text-xs text-slate-600">
        Periodo {row.period}
        {row.worker_name ? " · " + row.worker_name : ""}
      </p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {row.reason && <Badge>{REASONS[row.reason] ?? row.reason}</Badge>}
        {row.due_date && (
          <span>
            Entrega hasta {row.due_date.split("-").reverse().join("/")}
          </span>
        )}
        {row.received_at && (
          <span>
            Recibido{" "}
            {new Intl.DateTimeFormat("es-PE", {
              timeZone: "America/Lima",
              dateStyle: "short",
            }).format(new Date(row.received_at))}
          </span>
        )}
        {!row.reason && (
          <Badge>
            {row.state === "aprobado" ? "Aprobado" : "Pendiente de aprobación"}
          </Badge>
        )}
      </div>
    </article>
  ));
}

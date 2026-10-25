import Link from "next/link";

import { Badge } from "@/components/atoms/badge";
import type { WorkerCardProps } from "@/features/workers/types/worker-ui.types";

export function WorkerCard({ worker, origin }: WorkerCardProps) {
  return (
    <article className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <div className="min-w-0 space-y-1">
        <Link
          className="inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline"
          href={`/empresas/${worker.company_id}/trabajadores/${worker.id}${origin ? `?returnTo=${encodeURIComponent(origin)}` : ""}`}
        >
          {worker.first_names} {worker.last_names}
        </Link>
        <p className="text-sm text-zinc-600">
          {worker.identity_type} {worker.identity_number}
        </p>
      </div>
      <Badge>
        {worker.deleted_at
          ? "Eliminado"
          : worker.employment_status === "active"
            ? "Relación activa"
            : worker.employment_status === "ended"
              ? "Cesado"
              : "Sin periodo laboral registrado"}
      </Badge>
    </article>
  );
}

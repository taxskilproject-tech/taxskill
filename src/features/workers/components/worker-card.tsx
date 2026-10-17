import Link from "next/link";

import { Badge } from "@/components/atoms/badge";
import type { WorkerCardProps } from "@/features/workers/types/worker-ui.types";

export function WorkerCard({ worker }: WorkerCardProps) {
  return (
    <article className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-5">
      <div className="min-w-0 space-y-2">
        <Link
          className="inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline"
          href={`/empresas/${worker.company_id}/trabajadores/${worker.id}`}
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
              : "Sin etapa registrada"}
      </Badge>
    </article>
  );
}

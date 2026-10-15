import Link from "next/link";

import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { ResourceState } from "@/components/organisms/resource-state";
import { LifecycleControl } from "@/features/access/components/lifecycle-control";
import type { CompanyListProps } from "@/features/access/types/access-ui.types";

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  inactive: "Inactiva",
  suspended: "Suspendida",
};

export function CompanyList({
  companies,
  isAdmin,
  onEdit,
  onChanged,
}: CompanyListProps) {
  if (!companies.length)
    return (
      <ResourceState
        description="Prueba otros filtros o solicita una asignación al administrador."
        kind="empty"
        title="No hay empresas para mostrar"
      />
    );
  return (
    <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
      {companies.map((company) => (
        <li
          className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"
          key={company.id}
        >
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              {company.deleted_at ? (
                <p className="font-medium">{company.legal_name}</p>
              ) : (
                <Link
                  className="font-medium underline-offset-4 hover:underline focus-visible:outline-2"
                  href={`/empresas/${company.id}`}
                >
                  {company.legal_name}
                </Link>
              )}
              <Badge>
                {company.deleted_at
                  ? "Eliminada"
                  : STATUS_LABELS[company.status]}
              </Badge>
            </div>
            <p className="text-sm text-zinc-500">
              RUC {company.ruc} · Control desde {company.control_start_date}
            </p>
            {company.deleted_at && (
              <p className="text-sm text-zinc-600">
                Motivo: {company.deletion_reason}
              </p>
            )}
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              {!company.deleted_at && (
                <Button onClick={() => onEdit(company)} variant="secondary">
                  Editar
                </Button>
              )}
              <LifecycleControl
                deleted={Boolean(company.deleted_at)}
                entity="companies"
                id={company.id}
                onChanged={onChanged}
                revision={company.revision}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

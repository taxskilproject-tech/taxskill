import Link from "next/link";

import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { ResourceState } from "@/components/organisms/resource-state";
import { LifecycleControl } from "@/features/access/components/lifecycle-control";
import type { CompanyListProps } from "@/features/access/types/access-ui.types";

const STATUS_LABELS: Readonly<Record<string, string>> = {
  active: "Activa",
  inactive: "Inactiva",
  suspended: "Suspendida",
};
export function CompanyList({
  companies,
  isAdmin,
  onEdit,
  onChanged,
  origin,
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
    <table className="block w-full rounded-xl border border-zinc-200 bg-white text-left text-sm lg:table">
      <caption className="sr-only">Empresas del estudio</caption>
      <thead className="hidden border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600 lg:table-header-group">
        <tr>
          <th className="p-3" scope="col">
            Empresa
          </th>
          <th className="p-3" scope="col">
            RUC / inicio de control
          </th>
          <th className="p-3" scope="col">
            Estado
          </th>
          {isAdmin && (
            <th className="p-3" scope="col">
              Acciones
            </th>
          )}
        </tr>
      </thead>
      <tbody className="block divide-y divide-zinc-100 lg:table-row-group">
        {companies.map((company) => (
          <tr className="block p-3 lg:table-row lg:p-0" key={company.id}>
            <td className="block lg:table-cell lg:p-3">
              {company.deleted_at ? (
                <p className="font-medium">{company.legal_name}</p>
              ) : (
                <Link
                  className="inline-flex min-h-11 items-center font-medium underline-offset-4 hover:underline"
                  href={`/empresas/${company.id}${origin ? `?returnTo=${encodeURIComponent(origin)}` : ""}`}
                >
                  {company.legal_name}
                </Link>
              )}
              {company.deletion_reason && (
                <p className="text-xs text-zinc-600">
                  {company.deletion_reason}
                </p>
              )}
            </td>
            <td className="block text-xs text-zinc-500 lg:table-cell lg:p-3">
              RUC {company.ruc}
              <span className="ml-2 lg:ml-0 lg:block">
                Desde {company.control_start_date}
              </span>
            </td>
            <td className="inline-block py-2 lg:table-cell lg:p-3">
              <Badge>
                {company.deleted_at
                  ? "Eliminada"
                  : STATUS_LABELS[company.status]}
              </Badge>
            </td>
            {isAdmin && (
              <td className="block lg:table-cell lg:p-3">
                <div className="flex flex-wrap items-start gap-2">
                  {!company.deleted_at && (
                    <Button onClick={() => onEdit(company)} variant="secondary">
                      Editar
                    </Button>
                  )}
                  <details>
                    <summary className="min-h-11 cursor-pointer px-3 py-3 text-sm">
                      Más acciones
                    </summary>
                    <LifecycleControl
                      deleted={Boolean(company.deleted_at)}
                      entity="companies"
                      id={company.id}
                      onChanged={onChanged}
                      revision={company.revision}
                    />
                  </details>
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

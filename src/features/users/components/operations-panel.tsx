"use client";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/atoms/badge";
import { QueryState } from "@/features/access/components/query-state";
import { listOperations } from "@/features/access/repositories/access.repository";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { useDataScope } from "@/lib/query/hooks/use-data-scope";
import { createScopedQueryKey } from "@/lib/query/utils/query-keys";

export function OperationsPanel() {
  const { context } = useWorkspace();
  const scope = useDataScope();
  const operations = useQuery({
    queryKey: createScopedQueryKey(scope!, "admin-operations"),
    queryFn: ({ signal }) => listOperations(context.organization.id, signal),
  });
  return (
    <details className="rounded-xl border border-zinc-200 bg-white p-5">
      <summary className="min-h-11 cursor-pointer text-sm font-medium">
        Estado de operaciones administrativas
      </summary>
      <p className="my-4 text-xs leading-6 text-zinc-500">
        Últimas 25 operaciones. Ante un fallo, conserva el formulario y
        reintenta sin cambiar la entrada. Si una ejecución sigue en curso,
        espera dos minutos antes de recuperarla.
      </p>
      <QueryState
        error={operations.error}
        loading={operations.isPending}
        onRetry={() => {
          void operations.refetch();
        }}
        retrying={operations.isFetching}
      >
        <ul className="space-y-3">
          {operations.data?.map((item) => (
            <li
              className="flex flex-wrap justify-between gap-3 border-t border-zinc-100 pt-3"
              key={item.request_id}
            >
              <div>
                <p className="text-sm">{item.operation}</p>
                <p className="mt-1 text-xs break-all text-zinc-500">
                  Solicitud {item.request_id}
                </p>
                {item.error_code && (
                  <p className="text-xs text-zinc-600">{item.error_code}</p>
                )}
              </div>
              <Badge>{item.status}</Badge>
            </li>
          ))}
        </ul>
        {!operations.data?.length && (
          <p className="text-sm text-zinc-500">Sin operaciones registradas.</p>
        )}
      </QueryState>
    </details>
  );
}

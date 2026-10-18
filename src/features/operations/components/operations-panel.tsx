"use client";

import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/atoms/button";
import { SectionPanel } from "@/components/organisms/section-panel";
import { formatLimaDateTime } from "@/domain/time/utils/instant";
import { QueryState } from "@/features/access/components/query-state";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { OperationsStatus } from "@/features/operations/components/operations-status";
import { loadOperations } from "@/features/operations/repositories/operations.repository";
import { useDataScope } from "@/lib/query/hooks/use-data-scope";
import { createScopedQueryKey } from "@/lib/query/utils/query-keys";

export function OperationsPanel() {
  const { context } = useWorkspace();
  const scope = useDataScope();
  const query = useQuery({
    queryKey: createScopedQueryKey(scope!, "operations"),
    queryFn: ({ signal }) => loadOperations(context.organization.id, signal),
    enabled: context.member.is_admin,
  });
  const lastBackup = query.data?.last_backup_at
    ? formatLimaDateTime(query.data.last_backup_at)
    : null;
  return (
    <SectionPanel
      headingId="operations-heading"
      title="Operación del sistema"
      description="Incidencias de cargas, generación, responsables, WhatsApp y respaldos del estudio."
    >
      <div>
        <Button
          loading={query.isFetching}
          loadingText="Consultando estado…"
          onClick={() => {
            void query.refetch();
          }}
          variant="secondary"
        >
          Actualizar estado
        </Button>
      </div>
      <QueryState
        loading={query.isPending}
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
        retrying={query.isFetching}
      >
        {query.data && <OperationsStatus snapshot={query.data} />}
      </QueryState>
      <p className="text-sm text-zinc-600">
        Último respaldo confirmado:{" "}
        {lastBackup?.ok ? `${lastBackup.data} (Lima)` : "Sin registro"}.
      </p>
    </SectionPanel>
  );
}

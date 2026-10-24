"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { SidePanel } from "@/components/organisms/side-panel";
import { canPerform } from "@/domain/access/utils/permissions";
import { workerListSchema } from "@/domain/workers/contracts/worker.schema";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { useCurrentRoute } from "@/features/access/hooks/use-current-route";
import { usePresentation } from "@/features/access/hooks/use-presentation";
import { presentationPage } from "@/features/access/utils/presentation-page";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { WorkerCard } from "@/features/workers/components/worker-card";
import { WorkerFilters } from "@/features/workers/components/worker-filters";
import { WorkerForm } from "@/features/workers/components/worker-form";
import { useWorkerQuery } from "@/features/workers/hooks/use-worker-query";
import type { WorkersPanelProps } from "@/features/workers/types/worker-ui.types";

export function WorkersPanel({ companyId }: WorkersPanelProps) {
  const origin = useCurrentRoute();
  const { context } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const [pageValue, selectPage] = usePresentation("workerPage", "1");
  const page = presentationPage(pageValue);
  const setPage = (value: number) => selectPage(String(value));
  const [search, setSearch] = usePresentation("workerQuery", "");
  const [status, setStatus] = usePresentation("workerStatus", "all", [
    "all",
    "active",
    "ended",
    "unregistered",
  ]);
  const [deletedValue, selectDeleted] = usePresentation(
    "workerDeleted",
    "false",
    ["true", "false"],
  );
  const deleted = deletedValue === "true";
  const setDeleted = (value: boolean) => selectDeleted(String(value));
  const canManage = canPerform(
    context.capabilities,
    companyId,
    "laboral_trabajador",
    "workers.manage",
    context.member.member_type,
  );
  const query = useWorkerQuery(
    "workers",
    {
      company_id: companyId,
      page,
      q: search,
      status,
      include_deleted: deleted,
    },
    workerListSchema,
  );
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Trabajadores</h2>
          <p className="sr-only">
            Cada expediente conserva sus etapas de ingreso, relación y cese.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setCreating(true)}>
            Registrar trabajador
          </Button>
        )}
      </div>
      {creating && (
        <SidePanel
          title="Registrar trabajador"
          onClose={() => setCreating(false)}
        >
          <WorkerForm
            companyId={companyId}
            onCancel={() => setCreating(false)}
            onSaved={() => setCreating(false)}
          />
        </SidePanel>
      )}
      <WorkerFilters
        deleted={deleted}
        isAdmin={context.member.is_admin}
        onDeleted={setDeleted}
        onSearch={setSearch}
        onStatus={setStatus}
        search={search}
        status={status}
      />
      <QueryState
        error={query.error}
        loading={query.isPending}
        onRetry={() => {
          void query.refetch();
        }}
        retrying={query.isFetching}
      >
        <Pagination
          count={query.data?.count ?? 0}
          onPage={setPage}
          page={page}
        />
        <div className="space-y-3">
          {query.data?.rows.map((worker) => (
            <WorkerCard key={worker.id} worker={worker} origin={origin} />
          ))}
          {query.data?.count === 0 && (
            <p className="text-sm text-zinc-600">
              No hay trabajadores que coincidan con estos filtros.
            </p>
          )}
        </div>
        <Pagination
          count={query.data?.count ?? 0}
          onPage={setPage}
          page={page}
        />
      </QueryState>
    </section>
  );
}

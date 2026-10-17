"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { canPerform } from "@/domain/access/utils/permissions";
import { workerListSchema } from "@/domain/workers/contracts/worker.schema";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { WorkerCard } from "@/features/workers/components/worker-card";
import { WorkerFilters } from "@/features/workers/components/worker-filters";
import { WorkerForm } from "@/features/workers/components/worker-form";
import { useWorkerQuery } from "@/features/workers/hooks/use-worker-query";
import type { WorkersPanelProps } from "@/features/workers/types/worker-ui.types";

export function WorkersPanel({ companyId }: WorkersPanelProps) {
  const { context } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [deleted, setDeleted] = useState(false);
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
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Trabajadores</h2>
          <p className="mt-2 text-sm text-zinc-600">
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
        <WorkerForm
          companyId={companyId}
          onCancel={() => setCreating(false)}
          onSaved={() => setCreating(false)}
        />
      )}
      <WorkerFilters
        deleted={deleted}
        isAdmin={context.member.is_admin}
        onDeleted={(value) => {
          setDeleted(value);
          setPage(1);
        }}
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onStatus={(value) => {
          setStatus(value);
          setPage(1);
        }}
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
        <div className="space-y-3">
          {query.data?.rows.map((worker) => (
            <WorkerCard key={worker.id} worker={worker} />
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

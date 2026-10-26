"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { ResourceState } from "@/components/organisms/resource-state";
import { canPerform } from "@/domain/access/utils/permissions";
import { normalizeOperationError } from "@/domain/common/utils/normalize-operation-error";
import { workerDetailSchema } from "@/domain/workers/contracts/worker.schema";
import { PageHeading } from "@/features/access/components/page-heading";
import { QueryState } from "@/features/access/components/query-state";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { safeReturnTo } from "@/features/auth/utils/safe-return-to";
import { WorkerWorkspace } from "@/features/workers/components/worker-workspace";
import { useWorkerQuery } from "@/features/workers/hooks/use-worker-query";
import type { WorkerDetailPageProps } from "@/features/workers/types/worker-ui.types";

export function WorkerDetailPage({
  companyId,
  workerId,
}: WorkerDetailPageProps) {
  const { context, company } = useWorkspace();
  const parameters = useSearchParams();
  const returnTo = parameters.get("returnTo")
    ? safeReturnTo(parameters.get("returnTo"))
    : `/empresas/${companyId}?tab=laboral_trabajador`;
  const selectedId = parameters.get("employmentPeriodId") ?? undefined;
  const [page, setPage] = useState(1);
  const valid =
    z.uuid().safeParse(companyId).success &&
    z.uuid().safeParse(workerId).success &&
    (!selectedId || z.uuid().safeParse(selectedId).success);
  const authorized =
    company.kind !== "internal" &&
    (company.kind !== "company" || company.companyId === companyId) &&
    context.companies.some((item) => item.id === companyId);
  const query = useWorkerQuery(
    "worker",
    {
      company_id: companyId,
      worker_id: workerId,
      employment_period_id: selectedId,
      page,
    },
    workerDetailSchema,
    valid && authorized,
  );
  const canManage = canPerform(
    context.capabilities,
    companyId,
    "laboral_trabajador",
    "workers.manage",
    context.member.member_type,
  );
  if (
    !valid ||
    !authorized ||
    (query.error && normalizeOperationError(query.error).code === "NOT_FOUND")
  )
    return (
      <div className="space-y-5">
        <Link
          className="inline-flex min-h-11 items-center text-sm underline"
          href="/empresas"
        >
          ← Volver a empresas
        </Link>
        <ResourceState
          description="El expediente o el periodo laboral no están disponibles en este contexto."
          kind="not-found"
          title="Expediente no encontrado"
        />
      </div>
    );
  return (
    <div className="space-y-2">
      <QueryState
        error={query.error}
        loading={query.isPending}
        onRetry={() => {
          void query.refetch();
        }}
        retrying={query.isFetching}
      >
        {query.data && (
          <div className="space-y-2">
            <PageHeading
              action={
                <Link
                  scroll={false}
                  className="inline-flex min-h-11 items-center text-sm text-blue-800 underline underline-offset-4"
                  aria-label="Volver a Laboral por trabajador"
                  href={returnTo}
                >
                  <span className="lg:hidden">← Volver</span>
                  <span className="hidden lg:inline">
                    ← Volver a Laboral por trabajador
                  </span>
                </Link>
              }
              description={`${query.data.company_name} · Expediente laboral`}
              title={`${query.data.worker.first_names} ${query.data.worker.last_names}`}
            />
            <WorkerWorkspace
              detail={query.data}
              canManage={canManage}
              page={page}
              onPage={setPage}
            />
          </div>
        )}
      </QueryState>
    </div>
  );
}

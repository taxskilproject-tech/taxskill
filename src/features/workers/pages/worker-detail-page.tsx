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
import { EmploymentActions } from "@/features/workers/components/employment-actions";
import { EmploymentEventForm } from "@/features/workers/components/employment-event-form";
import { EmploymentFacts } from "@/features/workers/components/employment-facts";
import { GenerationProgress } from "@/features/workers/components/generation-progress";
import { StageDocuments } from "@/features/workers/components/stage-documents";
import { StageSelector } from "@/features/workers/components/stage-selector";
import { WorkerFacts } from "@/features/workers/components/worker-facts";
import { WorkerLifecycle } from "@/features/workers/components/worker-lifecycle";
import { useWorkerQuery } from "@/features/workers/hooks/use-worker-query";
import type { WorkerDetailPageProps } from "@/features/workers/types/worker-ui.types";

export function WorkerDetailPage({
  companyId,
  workerId,
}: WorkerDetailPageProps) {
  const { context, company } = useWorkspace();
  const parameters = useSearchParams();
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
          description="El expediente o la etapa no están disponibles en este contexto."
          kind="not-found"
          title="Expediente no encontrado"
        />
      </div>
    );
  return (
    <div className="space-y-6">
      <Link
        className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
        href={`/empresas/${companyId}?tab=laboral_trabajador`}
      >
        ← Volver al área laboral
      </Link>
      <QueryState
        error={query.error}
        loading={query.isPending}
        onRetry={() => {
          void query.refetch();
        }}
        retrying={query.isFetching}
      >
        {query.data && (
          <div className="space-y-6">
            <PageHeading
              description={`${query.data.company_name} · Expediente laboral`}
              title={`${query.data.worker.first_names} ${query.data.worker.last_names}`}
            />
            <WorkerFacts worker={query.data.worker} />
            <StageSelector detail={query.data} onPage={setPage} page={page} />
            <EmploymentActions
              canManage={canManage}
              detail={query.data}
              key={query.data.selected_period?.id ?? "empty"}
            />
            {query.data.selected_period && (
              <EmploymentFacts stage={query.data.selected_period} />
            )}
            <GenerationProgress canManage={canManage} detail={query.data} />
            <EmploymentEventForm
              canManage={canManage}
              detail={query.data}
              key={`event:${query.data.selected_period?.id}`}
            />
            <StageDocuments detail={query.data} />
            {context.member.is_admin && canManage && (
              <WorkerLifecycle
                key={query.data.worker.deleted_at ?? "active"}
                worker={query.data.worker}
              />
            )}
          </div>
        )}
      </QueryState>
    </div>
  );
}

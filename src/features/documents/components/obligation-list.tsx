"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { ResourceState } from "@/components/organisms/resource-state";
import { summarySchema } from "@/domain/documents/contracts/document.schema";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { ObligationCard } from "@/features/documents/components/obligation-card";
import { ObligationFilters } from "@/features/documents/components/obligation-filters";
import { useDocumentQuery } from "@/features/documents/hooks/use-document-query";
import type { ObligationListProps } from "@/features/documents/types/document-ui.types";

const listSchema = z.object({
  rows: z.array(summarySchema),
  count: z.number(),
});
export function ObligationList({
  companyId,
  module,
  workerId,
  employmentPeriodId,
  employmentStage,
}: ObligationListProps) {
  const { company } = useWorkspace();
  const pathname = usePathname();
  const parameters = useSearchParams();
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState("");
  const [state, setState] = useState("");
  const companyFilter =
    companyId ?? (company.kind === "company" ? company.companyId : undefined);
  const query = useDocumentQuery(
    "list",
    {
      page,
      company_id: companyFilter,
      module,
      worker_id: workerId,
      employment_period_id: employmentPeriodId,
      employment_stage: employmentStage,
      period,
      state,
    },
    listSchema,
    company.kind !== "internal",
  );
  if (company.kind === "internal")
    return (
      <ResourceState
        description="Las actividades internas se incorporan en H06. Este recorrido corresponde a obligaciones de empresas."
        kind="empty"
        title="Sin obligaciones documentales internas"
      />
    );
  return (
    <div className="space-y-5">
      <ObligationFilters
        onPeriod={(value) => {
          setPeriod(value);
          setPage(1);
        }}
        onState={(value) => {
          setState(value);
          setPage(1);
        }}
        period={period}
        state={state}
      />
      <QueryState
        error={query.error}
        loading={query.isPending}
        onRetry={() => {
          void query.refetch();
        }}
        retrying={query.isFetching}
      >
        <div className="space-y-4">
          {query.data?.rows.map((obligation) => (
            <ObligationCard
              key={obligation.id}
              obligation={obligation}
              origin={pathname + (parameters.size ? `?${parameters}` : "")}
            />
          ))}
          {query.data?.count === 0 && (
            <ResourceState
              description="Las obligaciones aparecerán después de activar y generar una regla en Configuración."
              kind="empty"
              title="No hay obligaciones en este contexto"
            />
          )}
          <Pagination
            count={query.data?.count ?? 0}
            onPage={setPage}
            page={page}
          />
        </div>
      </QueryState>
    </div>
  );
}

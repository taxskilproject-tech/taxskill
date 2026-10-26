"use client";
import { z } from "zod";

import { FilterDisclosure } from "@/components/molecules/filter-disclosure";
import { ResourceState } from "@/components/organisms/resource-state";
import { summarySchema } from "@/domain/documents/contracts/document.schema";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { useCurrentRoute } from "@/features/access/hooks/use-current-route";
import { usePresentation } from "@/features/access/hooks/use-presentation";
import { presentationPage } from "@/features/access/utils/presentation-page";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { ObligationFilters } from "@/features/documents/components/obligation-filters";
import { ObligationRows } from "@/features/documents/components/obligation-rows";
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
  const origin = useCurrentRoute();
  const [pageValue, selectPage] = usePresentation("obligationPage", "1");
  const page = presentationPage(pageValue);
  const setPage = (value: number) => selectPage(String(value));
  const [period, setPeriod] = usePresentation("obligationPeriod", "");
  const [state, setState] = usePresentation("obligationState", "");
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
    <div className="space-y-2">
      <FilterDisclosure
        label="Filtros documentales"
        count={Number(Boolean(period)) + Number(Boolean(state))}
      >
        <ObligationFilters
          onPeriod={(value) => {
            setPeriod(value);
          }}
          onState={(value) => {
            setState(value);
          }}
          period={period}
          state={state}
        />
      </FilterDisclosure>
      <QueryState
        error={query.error}
        loading={query.isPending}
        onRetry={() => {
          void query.refetch();
        }}
        retrying={query.isFetching}
      >
        <div className="space-y-2">
          <Pagination
            count={query.data?.count ?? 0}
            onPage={setPage}
            page={page}
          />
          <ObligationRows
            rows={query.data?.rows ?? []}
            origin={origin}
            hideCompany={Boolean(companyFilter)}
          />
          {query.data?.count === 0 && (
            <ResourceState
              description="Las obligaciones aparecerán después de activar y generar un entregable en Configuración."
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

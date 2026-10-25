"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { FilterDisclosure } from "@/components/molecules/filter-disclosure";
import { SidePanel } from "@/components/organisms/side-panel";
import { activityListSchema } from "@/domain/activities/contracts/activity.schema";
import { activityQueryInput } from "@/domain/activities/utils/activity-filters";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { ActivityAdvancedFilters } from "@/features/activities/components/activity-advanced-filters";
import { ActivityGroups } from "@/features/activities/components/activity-groups";
import { ActivityIndicators } from "@/features/activities/components/activity-indicators";
import { ActivityPrimaryFilters } from "@/features/activities/components/activity-primary-filters";
import { ActivityResponsibleFilter } from "@/features/activities/components/activity-responsible-filter";
import { AdditionalForm } from "@/features/activities/components/additional-form";
import { AdditionalRulesPanel } from "@/features/activities/components/additional-rules-panel";
import { useActivityFilters } from "@/features/activities/hooks/use-activity-filters";
import { useActivityQuery } from "@/features/activities/hooks/use-activity-query";
import type { ActivityInboxProps } from "@/features/activities/types/activity-ui.types";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { ObligationRows } from "@/features/documents/components/obligation-rows";

export function ActivityInbox({ companyId }: ActivityInboxProps) {
  const { context, company } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const { filters, change, lockedCompany, origin } =
    useActivityFilters(companyId);
  const query = useActivityQuery(
    "activities",
    activityQueryInput(filters),
    activityListSchema,
  );
  const fixedCompany =
    companyId ?? (company.kind === "company" ? company.companyId : undefined);
  const activeCount = [
    filters.companyId,
    filters.module,
    filters.class,
    filters.responsibleId,
    filters.period,
    filters.priority,
    filters.dueFrom,
    filters.dueTo,
    filters.state,
  ].filter(Boolean).length;
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="activities-search">
          Buscar en actividades
        </label>
        <Input
          className="min-w-0 flex-1"
          id="activities-search"
          maxLength={150}
          onChange={(event) => change("q", event.target.value)}
          placeholder="Buscar actividades…"
          type="search"
          value={filters.q ?? ""}
        />
        {context.member.is_admin && (
          <Button
            onClick={() => {
              setCreated(false);
              setCreating(true);
            }}
          >
            Nueva actividad
          </Button>
        )}
      </div>
      {creating && (
        <SidePanel
          title="Actividad adicional"
          onClose={() => setCreating(false)}
          wide
        >
          <AdditionalForm
            companyId={fixedCompany}
            onCancel={() => setCreating(false)}
            onSaved={() => {
              setCreating(false);
              setCreated(true);
            }}
          />
        </SidePanel>
      )}
      {created && (
        <FeedbackMessage kind="success">
          Actividad creada. Consulta Todas si corresponde a otro responsable.
        </FeedbackMessage>
      )}
      <FilterDisclosure count={activeCount} label="Filtrar actividades">
        <ActivityPrimaryFilters
          filters={filters}
          lockedCompany={lockedCompany}
          onChange={change}
        />
        <ActivityResponsibleFilter
          filters={filters}
          key={filters.companyId ?? filters.scope}
          lockedCompany={lockedCompany}
          onChange={change}
        />
        <ActivityAdvancedFilters
          filters={filters}
          lockedCompany={lockedCompany}
          onChange={change}
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
        {query.data && (
          <>
            <ActivityGroups
              counts={query.data.groups}
              filters={filters}
              onGroup={(value) => change("group", value)}
            />
            <Pagination
              count={query.data.count}
              onPage={(value) => change("page", String(value))}
              page={filters.page}
              pageSize={filters.pageSize}
            />
            <ObligationRows
              rows={query.data.rows}
              origin={origin}
              hideCompany={Boolean(fixedCompany)}
            />
            {!query.data.count && (
              <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
                No hay actividades para este grupo y filtros. Puedes consultar
                Todas o cambiar los filtros.
              </p>
            )}
            {query.data.count > 0 && (
              <Pagination
                count={query.data.count}
                onPage={(value) => change("page", String(value))}
                page={filters.page}
                pageSize={filters.pageSize}
              />
            )}
            <FilterDisclosure label="Cumplimiento documental y adicional">
              <ActivityIndicators indicators={query.data.indicators} />
            </FilterDisclosure>
          </>
        )}
      </QueryState>
      {context.member.is_admin && (
        <AdditionalRulesPanel companyId={fixedCompany} />
      )}
    </section>
  );
}

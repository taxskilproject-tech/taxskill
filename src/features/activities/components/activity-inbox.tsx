"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
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
import { ObligationCard } from "@/features/documents/components/obligation-card";

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
  return (
    <section className="space-y-5">
      {context.member.is_admin && !creating && (
        <Button
          onClick={() => {
            setCreated(false);
            setCreating(true);
          }}
        >
          Crear actividad adicional
        </Button>
      )}
      {creating && (
        <AdditionalForm
          companyId={fixedCompany}
          onCancel={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            setCreated(true);
          }}
        />
      )}
      {created && (
        <FeedbackMessage kind="success">
          Actividad creada. Consulta el grupo Todas si corresponde a otro
          responsable.
        </FeedbackMessage>
      )}
      <ActivityPrimaryFilters
        filters={filters}
        lockedCompany={lockedCompany}
        onChange={change}
      />
      <ActivityAdvancedFilters
        filters={filters}
        lockedCompany={lockedCompany}
        onChange={change}
      />
      <ActivityResponsibleFilter
        filters={filters}
        key={`${filters.companyId ?? filters.scope}`}
        lockedCompany={lockedCompany}
        onChange={change}
      />
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
            <ActivityIndicators indicators={query.data.indicators} />
            <ActivityGroups
              counts={query.data.groups}
              filters={filters}
              onGroup={(value) => change("group", value)}
            />
            {query.data.rows.map((obligation) => (
              <ObligationCard
                key={obligation.id}
                obligation={obligation}
                origin={origin}
              />
            ))}
            {!query.data.count && (
              <p className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
                No hay actividades para este grupo y filtros. Puedes consultar
                Todas o cambiar los filtros.
              </p>
            )}
            <Pagination
              count={query.data.count}
              onPage={(value) => change("page", String(value))}
              page={filters.page}
              pageSize={filters.pageSize}
            />
          </>
        )}
      </QueryState>
      {context.member.is_admin && (
        <AdditionalRulesPanel companyId={fixedCompany} />
      )}
    </section>
  );
}

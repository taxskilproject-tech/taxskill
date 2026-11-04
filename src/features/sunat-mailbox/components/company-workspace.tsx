"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { sunatWorkspaceSchema } from "@/domain/sunat/contracts/sunat.schema";
import { getLimaDate } from "@/domain/time/utils/instant";
import { PageHeading } from "@/features/access/components/page-heading";
import { QueryState } from "@/features/access/components/query-state";
import { useWorkspace } from "@/features/auth/providers/workspace-context";

import { useSunatAction } from "../hooks/use-sunat-action";
import { useSunatQuery } from "../hooks/use-sunat-query";
import type { SunatCompanyProps } from "../types/ui.types";
import { parseSunatFilters, sunatFilterDestination } from "../utils/filters";
import { activeSunatJob, canResumeSunatMonth } from "../utils/presentation";
import { SunatConnectionPanel } from "./connection-panel";
import { SunatConnectionStatus } from "./connection-status";
import { SunatInboxResults } from "./inbox-results";
import { SunatMailboxFilters } from "./mailbox-filters";
import { SunatMessageDetailPanel } from "./message-detail-panel";

export function SunatCompanyWorkspace({ companyId }: SunatCompanyProps) {
  const { context } = useWorkspace();
  const parameters = useSearchParams();
  const router = useRouter();
  const [configure, setConfigure] = useState(false);
  const [requestedPeriod, setRequestedPeriod] = useState<number | null>(null);
  const filters = parseSunatFilters(
    new URLSearchParams(parameters.toString()),
    new Date(),
  );
  const workspace = useSunatQuery(
    "workspace",
    { company_id: companyId, year: filters.year, month: filters.month },
    sunatWorkspaceSchema,
    true,
    true,
  );
  const action = useSunatAction();
  const selectedCompany = context.companies.find(
    (item) => item.id === companyId,
  );
  const active = workspace.data ? activeSunatJob(workspace.data) : undefined;
  const resume = canResumeSunatMonth(
    workspace.data,
    filters.year,
    filters.month,
  );
  const today = getLimaDate(new Date());
  const selectedPeriod = filters.year * 100 + filters.month;
  const future =
    today.ok &&
    selectedPeriod >
      Number(today.data.slice(0, 4)) * 100 + Number(today.data.slice(5, 7));
  function refresh() {
    void workspace.refetch();
  }
  function change(values: Record<string, string>) {
    action.clear();
    router.replace(
      sunatFilterDestination(
        new URLSearchParams(parameters.toString()),
        values,
      ),
      { scroll: false },
    );
  }
  async function sync() {
    setRequestedPeriod(selectedPeriod);
    const pending = action.submit(
      resume ? "ResumeSync" : "RequestSync",
      { company_id: companyId, year: filters.year, month: filters.month },
      true,
    );
    void workspace.refetch();
    await pending;
    refresh();
  }
  return (
    <section className="space-y-3">
      <PageHeading
        title="Buzón SUNAT"
        description={
          (selectedCompany?.legal_name ?? "Empresa seleccionada") +
          " · RUC " +
          selectedCompany?.ruc
        }
        action={
          context.member.is_admin && workspace.data ? (
            <Button variant="secondary" onClick={() => setConfigure(true)}>
              Configurar conexión
            </Button>
          ) : undefined
        }
      />
      <SunatMailboxFilters
        filters={filters}
        onChange={change}
        action={
          <Button
            loading={action.busy}
            loadingText="Consultando SUNAT…"
            aria-describedby="sunat-refresh-help"
            disabled={
              !workspace.data?.worker_ready ||
              workspace.data.connection?.state !== "connected" ||
              Boolean(active) ||
              future
            }
            onClick={() => {
              void sync();
            }}
          >
            {resume ? "Continuar consulta en SUNAT" : "Actualizar desde SUNAT"}
          </Button>
        }
      />
      <QueryState
        loading={workspace.isPending}
        error={workspace.error}
        retrying={workspace.isFetching}
        onRetry={() => {
          void workspace.refetch();
        }}
      >
        {workspace.data && (
          <>
            <SunatConnectionStatus
              workspace={workspace.data}
              actionError={
                requestedPeriod === selectedPeriod ? action.error : null
              }
              periodUpdated={
                requestedPeriod === selectedPeriod &&
                action.result?.state === "complete"
              }
            />
            <SunatInboxResults
              companyId={companyId}
              filters={filters}
              workspace={workspace.data}
              onChange={change}
            />
            {configure && context.member.is_admin && (
              <SunatConnectionPanel
                workspace={workspace.data}
                onChanged={refresh}
                onClose={() => setConfigure(false)}
              />
            )}
            {filters.messageId && (
              <SunatMessageDetailPanel
                companyId={companyId}
                messageId={filters.messageId}
                onChanged={refresh}
                onClose={() => change({ messageId: "" })}
              />
            )}
          </>
        )}
      </QueryState>
    </section>
  );
}

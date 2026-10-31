"use client";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { SectionNavigation } from "@/components/molecules/section-navigation";
import { sunatAlertsSchema } from "@/domain/sunat/contracts/sunat.schema";
import { formatLimaDateTime } from "@/domain/time/utils/instant";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { useWorkspace } from "@/features/auth/providers/workspace-context";

import { useSunatAction } from "../hooks/use-sunat-action";
import { useSunatQuery } from "../hooks/use-sunat-query";
import type { SunatAlertRowProps } from "../types/ui.types";

function SunatAlertRow({ alert, onChanged }: SunatAlertRowProps) {
  const action = useSunatAction();
  const date = formatLimaDateTime(alert.created_at);
  const month = alert.published_on?.slice(5, 7);
  const year = alert.published_on?.slice(0, 4);
  const target =
    `/buzon-sunat?companyId=${alert.company_id}` +
    (alert.message_id
      ? `&messageId=${alert.message_id}&year=${year}&month=${month}`
      : "");
  async function markRead() {
    if (await action.submit("MarkAlertRead", { id: alert.id })) onChanged();
  }
  return (
    <article
      className={`rounded-lg border px-3 py-2 ${alert.read_at ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <Link
          className="min-h-11 py-2 text-sm hover:underline focus-visible:outline-2"
          href={target}
        >
          <h2 className="font-semibold">{alert.title}</h2>
          <p>{alert.body}</p>
          <p className="text-xs text-slate-600">
            {date.ok ? date.data : "Fecha no disponible"} ·{" "}
            {alert.read_at ? "Leída" : "Sin leer"}
          </p>
        </Link>
        {!alert.read_at && (
          <Button
            variant="secondary"
            loading={action.busy}
            loadingText="Marcando…"
            onClick={() => {
              void markRead();
            }}
          >
            Marcar leída
          </Button>
        )}
      </div>
      {action.error && (
        <FeedbackMessage kind="error">{action.error}</FeedbackMessage>
      )}
    </article>
  );
}

export function SunatAlerts() {
  const { company } = useWorkspace();
  const [page, setPage] = useState(1);
  const [unread, setUnread] = useState(false);
  const query = useSunatQuery(
    "alerts",
    {
      page,
      unread_only: unread,
      company_id: company.kind === "company" ? company.companyId : undefined,
    },
    sunatAlertsSchema,
  );
  return (
    <section className="space-y-2">
      <SectionNavigation
        label="Avisos del buzón"
        selected={unread ? "unread" : "all"}
        items={[
          { id: "all", label: "Todas" },
          { id: "unread", label: "Sin leer" },
        ]}
        onSelect={(value) => {
          setUnread(value === "unread");
          setPage(1);
        }}
      />
      <QueryState
        loading={query.isPending}
        error={query.error}
        retrying={query.isFetching}
        onRetry={() => {
          void query.refetch();
        }}
      >
        <Pagination
          count={query.data?.count ?? 0}
          page={page}
          onPage={setPage}
        />
        {query.data?.rows.map((alert) => (
          <SunatAlertRow
            key={alert.id}
            alert={alert}
            onChanged={() => {
              void query.refetch();
            }}
          />
        ))}
        {query.data?.count === 0 && (
          <FeedbackMessage>
            No hay avisos del buzón en esta selección. Se generan después de las
            consultas diarias con novedades verificadas.
          </FeedbackMessage>
        )}
      </QueryState>
    </section>
  );
}

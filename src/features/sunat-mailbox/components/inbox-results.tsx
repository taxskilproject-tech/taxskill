"use client";
import { useEffect } from "react";

import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { ResourceState } from "@/components/organisms/resource-state";
import { sunatMessageListSchema } from "@/domain/sunat/contracts/sunat.schema";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";

import { useSunatQuery } from "../hooks/use-sunat-query";
import type { SunatInboxProps } from "../types/ui.types";
import { SunatMessageList } from "./message-list";

export function SunatInboxResults({
  companyId,
  filters,
  workspace,
  onChange,
}: SunatInboxProps) {
  const messages = useSunatQuery(
    "messages",
    {
      company_id: companyId,
      year: filters.year,
      month: filters.month,
      mailbox: filters.mailbox,
      q: filters.q,
      page: filters.page,
    },
    sunatMessageListSchema,
  );
  const relevant = workspace.months.filter(
    (month) => filters.mailbox === "all" || month.mailbox === filters.mailbox,
  );
  const certified =
    relevant.length === (filters.mailbox === "all" ? 2 : 1) &&
    relevant.every((month) => month.state === "complete");
  const finished = workspace.jobs.map((job) => job.id + job.state).join(":");
  const refetch = messages.refetch;
  useEffect(() => {
    void refetch();
  }, [finished, refetch]);
  return (
    <section className="space-y-2">
      {!certified && (messages.data?.count ?? 0) > 0 && (
        <FeedbackMessage kind="warning">
          Hay registros guardados, pero la consulta completa de este periodo
          todavía no está confirmada.
        </FeedbackMessage>
      )}
      <QueryState
        loading={messages.isPending}
        error={messages.error}
        retrying={messages.isFetching}
        onRetry={() => {
          void refetch();
        }}
      >
        <Pagination
          page={filters.page}
          count={messages.data?.count ?? 0}
          onPage={(page) => onChange({ page: String(page) })}
        />
        {messages.data?.count === 0 ? (
          <ResourceState
            kind="empty"
            title={
              filters.q
                ? "Sin coincidencias con esta búsqueda"
                : certified
                  ? "Periodo consultado sin mensajes"
                  : "Periodo todavía sin consulta completa"
            }
            description={
              filters.q
                ? "Prueba otro asunto o elimina el filtro de búsqueda. La integridad de la consulta se indica por separado."
                : workspace.connection?.state === "connected"
                  ? "Consulta este periodo para verificar los registros. Los errores se muestran por separado."
                  : "El administrador debe configurar y verificar la conexión de esta empresa."
            }
          />
        ) : (
          messages.data && (
            <SunatMessageList
              data={messages.data}
              onOpen={(id) => onChange({ messageId: id })}
            />
          )
        )}
        {(messages.data?.count ?? 0) > 25 && (
          <Pagination
            page={filters.page}
            count={messages.data?.count ?? 0}
            onPage={(page) => onChange({ page: String(page) })}
          />
        )}
      </QueryState>
    </section>
  );
}

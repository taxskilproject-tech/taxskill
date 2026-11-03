"use client";
import { useEffect } from "react";

import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { ResourceState } from "@/components/organisms/resource-state";
import { sunatMessageListSchema } from "@/domain/sunat/contracts/sunat.schema";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";

import { useSunatQuery } from "../hooks/use-sunat-query";
import type { SunatInboxProps } from "../types/ui.types";
import { sunatErrorMessage } from "../utils/presentation";
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
  const period = workspace.months.find(
    (month) => month.mailbox === filters.mailbox,
  );
  const certified = period?.state === "complete";
  const mailboxName =
    filters.mailbox === "notifications" ? "Notificaciones" : "Mensajes";
  const finished = workspace.jobs.map((job) => job.id + job.state).join(":");
  const refetch = messages.refetch;
  useEffect(() => {
    void refetch();
  }, [finished, refetch]);
  return (
    <section className="space-y-2" aria-label={mailboxName}>
      {period?.state === "partial" && (
        <FeedbackMessage kind="warning">
          Consulta parcial de {mailboxName}.{" "}
          {sunatErrorMessage(period.error_code) ||
            "Los registros recuperados permanecen disponibles."}
        </FeedbackMessage>
      )}
      {period?.state === "failed" && (
        <FeedbackMessage kind="error">
          Falló la consulta de {mailboxName}.{" "}
          {sunatErrorMessage(period.error_code)}
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
                  ? `Sin ${mailboxName.toLowerCase()} en este periodo`
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

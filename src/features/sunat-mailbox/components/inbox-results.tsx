"use client";
import { useEffect, useRef } from "react";

import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { ResourceState } from "@/components/organisms/resource-state";
import { sunatMessageListSchema } from "@/domain/sunat/contracts/sunat.schema";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";

import { useSunatQuery } from "../hooks/use-sunat-query";
import type { SunatInboxProps } from "../types/ui.types";
import { sunatDate, sunatErrorMessage } from "../utils/presentation";
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
  const previousJobs = useRef(finished);
  const refetch = messages.refetch;
  useEffect(() => {
    if (previousJobs.current === finished) return;
    previousJobs.current = finished;
    void refetch();
  }, [finished, refetch]);
  return (
    <section className="space-y-2" aria-label={mailboxName}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-sm font-semibold">Resultados guardados</h2>
        <p className="text-xs text-slate-600">
          {period
            ? `Último intento de esta bandeja en el mes: ${sunatDate(period.last_attempt_at)} · Lima`
            : "Sin consulta mensual registrada para esta bandeja."}
        </p>
      </div>
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
                  : "Sin registros guardados para este periodo"
            }
            description={
              filters.q
                ? "Prueba otro asunto o elimina el filtro de búsqueda."
                : certified
                  ? "La última consulta completa de esta bandeja no encontró registros para el periodo."
                  : "El listado está pendiente de confirmación. Usa Actualizar desde SUNAT cuando la conexión esté disponible."
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

"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";

import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { ResourceState } from "@/components/organisms/resource-state";
import { REVIEW_LABELS } from "@/domain/documents/constants/documents";
import { detailSchema } from "@/domain/documents/contracts/document.schema";
import { PageHeading } from "@/features/access/components/page-heading";
import { QueryState } from "@/features/access/components/query-state";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { safeReturnTo } from "@/features/auth/utils/safe-return-to";
import { DeliverableCard } from "@/features/documents/components/deliverable-card";
import { DispositionControl } from "@/features/documents/components/disposition-control";
import { ReassignmentControl } from "@/features/documents/components/reassignment-control";
import { VersionHistory } from "@/features/documents/components/version-history";
import { useDocumentQuery } from "@/features/documents/hooks/use-document-query";
import type { ObligationDetailProps } from "@/features/documents/types/document-ui.types";

export function ObligationDetailPage({ obligationId }: ObligationDetailProps) {
  const parameters = useSearchParams();
  const { company } = useWorkspace();
  const validId = z.uuid().safeParse(obligationId).success;
  const query = useDocumentQuery(
    "detail",
    { id: obligationId },
    detailSchema,
    validId,
  );
  const returnTo = parameters.get("returnTo")
    ? safeReturnTo(parameters.get("returnTo"))
    : "/actividades";
  if (
    !validId ||
    (company.kind === "internal" &&
      query.data &&
      query.data.summary.company_id !== null) ||
    (query.data &&
      company.kind === "company" &&
      company.companyId !== query.data.summary.company_id)
  )
    return (
      <ResourceState
        description="La obligación no existe o no está disponible en este contexto."
        kind="not-found"
        title="Obligación no encontrada"
      />
    );
  return (
    <div className="space-y-7">
      <Link
        className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
        href={returnTo}
      >
        ← Volver al listado
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
          <>
            <PageHeading
              action={
                <Button
                  loading={query.isFetching}
                  loadingText="Actualizando detalle…"
                  onClick={() => {
                    void query.refetch();
                  }}
                  variant="secondary"
                >
                  Actualizar detalle
                </Button>
              }
              description={`${query.data.summary.company_name ?? "Interna del estudio"} · ${query.data.summary.occurrence_key.startsWith("event:") ? "Solicitud eventual" : query.data.summary.occurrence_key.startsWith("unique:") ? "Actividad única" : `Periodo ${query.data.summary.occurrence_key}`}`}
              title={query.data.summary.title}
            />
            <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-5">
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  {query.data.summary.approved_count}/
                  {query.data.summary.total_count} archivos aprobados
                </p>
                <p className="text-sm text-zinc-600">
                  {query.data.summary.operational_due_date &&
                  query.data.summary.disposition === "active"
                    ? `Entrega pendiente hasta ${query.data.summary.operational_due_date}`
                    : "No hay entregas pendientes de este recorrido."}
                </p>
                {query.data.summary.disposition_reason && (
                  <p className="text-sm text-zinc-600">
                    Motivo: {query.data.summary.disposition_reason}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Badge>
                  {REVIEW_LABELS[query.data.summary.aggregate_state]}
                </Badge>
                {query.data.summary.overdue && <Badge>Entrega vencida</Badge>}
              </div>
            </section>
            {query.data.deliverables.map((deliverable) => (
              <DeliverableCard
                deliverable={deliverable}
                detail={query.data!}
                key={deliverable.id}
              />
            ))}
            <DispositionControl summary={query.data.summary} />
            <ReassignmentControl summary={query.data.summary} />
            <VersionHistory
              obligationId={obligationId}
              summary={query.data.summary}
            />
          </>
        )}
      </QueryState>
    </div>
  );
}

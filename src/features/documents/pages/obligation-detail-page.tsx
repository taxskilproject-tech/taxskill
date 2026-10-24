"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";

import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { ResourceState } from "@/components/organisms/resource-state";
import { REVIEW_ACTIONS } from "@/domain/access/constants/access";
import { canPerform } from "@/domain/access/utils/permissions";
import { REVIEW_LABELS } from "@/domain/documents/constants/documents";
import { detailSchema } from "@/domain/documents/contracts/document.schema";
import { periodLabel } from "@/domain/reporting/utils/report-labels";
import { PageHeading } from "@/features/access/components/page-heading";
import { QueryState } from "@/features/access/components/query-state";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { safeReturnTo } from "@/features/auth/utils/safe-return-to";
import { DispositionControl } from "@/features/documents/components/disposition-control";
import { ObligationWorkspace } from "@/features/documents/components/obligation-workspace";
import { ReassignmentControl } from "@/features/documents/components/reassignment-control";
import { useDocumentQuery } from "@/features/documents/hooks/use-document-query";
import type { ObligationDetailProps } from "@/features/documents/types/document-ui.types";

export function ObligationDetailPage({ obligationId }: ObligationDetailProps) {
  const parameters = useSearchParams();
  const { company, context } = useWorkspace();
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
  const detail = query.data;
  const wrongScope =
    detail &&
    ((company.kind === "internal" && detail.summary.company_id !== null) ||
      (company.kind === "company" &&
        company.companyId !== detail.summary.company_id));
  const canReview =
    detail &&
    REVIEW_ACTIONS.some((action) =>
      canPerform(
        context.capabilities,
        detail.summary.company_id,
        detail.summary.module,
        action,
        context.member.member_type,
      ),
    );
  if (!validId || wrongScope)
    return (
      <ResourceState
        description="La obligación no está disponible en este contexto."
        kind="not-found"
        title="Obligación no encontrada"
      />
    );
  return (
    <div className="space-y-3">
      <Link
        className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
        href={returnTo}
        scroll={false}
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
        {detail && (
          <>
            <PageHeading
              title={detail.summary.title}
              description={`${detail.summary.company_name ?? "Interna del estudio"} · ${periodLabel(detail.summary.occurrence_key, detail.summary.initial_due_date)}`}
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
            />
            <section className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-3">
              <p className="text-sm">
                <strong>
                  {detail.summary.approved_count}/{detail.summary.total_count}{" "}
                  archivos aprobados
                </strong>{" "}
                ·{" "}
                {detail.summary.operational_due_date
                  ? `Entrega hasta ${detail.summary.operational_due_date}`
                  : "Sin entregas pendientes"}
              </p>
              <div className="flex gap-2">
                <Badge>{REVIEW_LABELS[detail.summary.aggregate_state]}</Badge>
                {detail.summary.overdue && <Badge>Entrega vencida</Badge>}
              </div>
              {detail.summary.disposition_reason && (
                <p className="w-full text-sm text-zinc-600">
                  Motivo: {detail.summary.disposition_reason}
                </p>
              )}
            </section>
            <ObligationWorkspace
              detail={detail}
              obligationId={obligationId}
              canReview={Boolean(canReview)}
            />
            <details className="rounded-lg border border-zinc-200 bg-white p-3">
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
                Administrar obligación y responsable
              </summary>
              <DispositionControl summary={detail.summary} />
              <ReassignmentControl summary={detail.summary} />
            </details>
          </>
        )}
      </QueryState>
    </div>
  );
}

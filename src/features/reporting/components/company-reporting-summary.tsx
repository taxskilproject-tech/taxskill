"use client";
import Link from "next/link";

import { reportResultSchema } from "@/domain/reporting/contracts/reporting.schema";
import {
  compliance,
  limaMoment,
} from "@/domain/reporting/utils/report-filters";
import { QueryState } from "@/features/access/components/query-state";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { useReportQuery } from "@/features/reporting/hooks/use-report-query";
import type { CompanyReportingProps } from "@/features/reporting/types/reporting-ui.types";

export function CompanyReportingSummary({ companyId }: CompanyReportingProps) {
  const { context } = useWorkspace();
  const query = useReportQuery(
    "dashboard",
    { company_id: companyId },
    reportResultSchema,
  );
  const canReport =
    context.member.is_admin ||
    context.capabilities.some(
      (item) => item.company_id === companyId && item.action === "reports.view",
    );
  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="font-semibold">Supervisión de la empresa</h2>
      <QueryState
        error={query.error}
        loading={query.isPending}
        onRetry={() => {
          void query.refetch();
        }}
        retrying={query.isFetching}
      >
        {query.data && (
          <div className="space-y-3">
            <p className="text-2xl font-semibold">
              {compliance(
                query.data.metrics.approved,
                query.data.metrics.required,
              )}
            </p>
            <p className="text-sm text-zinc-600">
              {query.data.metrics.approved}/{query.data.metrics.required}{" "}
              obligaciones documentales exigibles aprobadas ·{" "}
              {query.data.metrics.additional_approved}/
              {query.data.metrics.additional_required} adicionales aprobadas ·{" "}
              {query.data.metrics.overdue} entregas vencidas.
            </p>
            <p className="text-xs text-zinc-500">
              Consulta: {limaMoment(query.data.queried_at)} · Lima.
            </p>
          </div>
        )}
      </QueryState>
      {canReport && (
        <Link
          className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          href={`/reportes?company_id=${companyId}`}
        >
          Consultar reporte y periodos →
        </Link>
      )}
      {context.member.is_admin && (
        <Link
          className="ml-4 inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          href={`/reportes?company_id=${companyId}&include_deleted=true`}
        >
          Consultar histórico administrativo →
        </Link>
      )}
    </section>
  );
}

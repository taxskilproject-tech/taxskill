"use client";
import Link from "next/link";

import { useWorkspace } from "@/features/auth/providers/workspace-context";
import type { CompanyReportingProps } from "@/features/reporting/types/reporting-ui.types";

import { CompanyFollowup } from "./company-followup";

export function CompanyReportingSummary({ companyId }: CompanyReportingProps) {
  const { context } = useWorkspace();
  const canReport =
    context.member.is_admin ||
    context.capabilities.some(
      (item) => item.company_id === companyId && item.action === "reports.view",
    );
  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
      <CompanyFollowup companyId={companyId} />
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

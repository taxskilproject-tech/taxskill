"use client";
import { useState } from "react";

import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { FormField } from "@/components/molecules/form-field";
import { ResourceState } from "@/components/organisms/resource-state";
import { companyIndicatorsSchema } from "@/domain/reporting/contracts/followup.schema";
import type { DeliveryIndicator } from "@/domain/reporting/types/followup.types";
import { getLimaDate } from "@/domain/time/utils/instant";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { useWorkspace } from "@/features/auth/providers/workspace-context";

import { useReportFilters } from "../hooks/use-report-filters";
import { useReportQuery } from "../hooks/use-report-query";
import type { CompanyFollowupProps } from "../types/followup-ui.types";
import { CompanyIndicatorRow } from "./company-indicator-row";
import { DeliveryIndicatorPanel } from "./delivery-indicator-panel";

export function CompanyFollowup({ companyId }: CompanyFollowupProps) {
  const { context, company } = useWorkspace();
  const { filters, change, error } = useReportFilters(true);
  const today = getLimaDate(new Date());
  const month =
    filters.document_month ?? (today.ok ? today.data.slice(0, 7) : "");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [indicator, setIndicator] = useState<DeliveryIndicator>("pending");
  const selected = companyId ?? filters.company_id;
  const panelCompany =
    !selected || selected === selectedCompany ? selectedCompany : null;
  const query = useReportQuery(
    "company_indicators",
    {
      company_id: selected,
      document_month: month,
      module: filters.module,
      page: filters.page,
    },
    companyIndicatorsSchema,
    !error && company.kind !== "internal",
  );
  if (company.kind === "internal") return null;
  return (
    <section aria-label="Indicadores por empresa" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-semibold">
          {context.member.member_type === "client"
            ? selected
              ? "Mi trabajo en esta empresa"
              : "Mi trabajo por empresa"
            : "Indicadores por empresa"}
        </h2>
        <FormField
          id="followup-month"
          label="Periodo documental"
          type="month"
          value={month}
          min="1000-01"
          max="2999-12"
          onChange={(event) => {
            change("document_month", event.target.value);
            setSelectedCompany(null);
          }}
        />
      </div>
      {error ? (
        <FeedbackMessage kind="error">{error}</FeedbackMessage>
      ) : (
        <QueryState
          loading={query.isPending}
          error={query.error}
          retrying={query.isFetching}
          onRetry={() => {
            void query.refetch();
          }}
        >
          {query.data && (
            <div className="space-y-2">
              {query.data.rows.map((row) => (
                <CompanyIndicatorRow
                  key={row.company_id}
                  row={row}
                  onSelect={(value) => {
                    setIndicator(value);
                    setSelectedCompany(row.company_id);
                  }}
                />
              ))}
              {query.data.count === 0 && (
                <ResourceState
                  kind="empty"
                  title="Sin empresas disponibles"
                  description="Selecciona otra empresa o revisa los accesos de tu cuenta."
                />
              )}
              {query.data.count > 25 && (
                <Pagination
                  count={query.data.count}
                  page={filters.page}
                  onPage={(page) => change("page", String(page))}
                />
              )}
            </div>
          )}
        </QueryState>
      )}
      <details className="text-xs text-slate-600">
        <summary className="min-h-11 cursor-pointer py-3">
          Cómo se calculan los indicadores
        </summary>
        <p>
          El cumplimiento cuenta obligaciones obligatorias aprobadas. Los demás
          indicadores cuentan archivos requeridos una sola vez. Una corrección
          pendiente puede tener entregas anteriores. Cada plazo se compara con
          su primera entrega validada, al cierre del día en Lima. Las
          actividades adicionales tienen su seguimiento separado.
        </p>
      </details>
      {panelCompany && (
        <DeliveryIndicatorPanel
          key={panelCompany + indicator + month + filters.module}
          companyId={panelCompany}
          indicator={indicator}
          month={month}
          module={filters.module}
          onClose={() => setSelectedCompany(null)}
        />
      )}
    </section>
  );
}

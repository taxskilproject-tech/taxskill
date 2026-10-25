"use client";
import Link from "next/link";

import { Icon } from "@/components/atoms/icon";
import { TONE_STYLES } from "@/components/constants/visual-styles";
import {
  compliance,
  serializeReportFilters,
} from "@/domain/reporting/utils/report-filters";
import { addReportIndicator } from "@/domain/reporting/utils/report-indicators";
import { ActiveReportIndicators } from "@/features/reporting/components/active-report-indicators";
import { REPORT_INDICATORS } from "@/features/reporting/constants/report-indicators";
import type { ReportMetricsProps } from "@/features/reporting/types/reporting-ui.types";

export function ReportMetrics({
  metrics,
  filters,
  mode,
  reviewAllowed = true,
}: ReportMetricsProps) {
  const destination = mode === "report" ? "/reportes" : "/dashboard";
  const cards = REPORT_INDICATORS.filter(
    (item) =>
      item.indicator !== "pending" &&
      (item.indicator !== "review" || reviewAllowed),
  );
  return (
    <section
      aria-label="Indicadores del alcance consultado"
      className="space-y-3"
    >
      <ActiveReportIndicators filters={filters} mode={mode} />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            aria-label={card.label}
            className={`rounded-xl border p-3 transition-colors hover:shadow-sm focus-visible:outline-2 focus-visible:outline-blue-600 ${TONE_STYLES[card.tone]}`}
            href={`${destination}?${serializeReportFilters(addReportIndicator(filters, card.indicator))}`}
            key={card.indicator}
          >
            <div className="flex items-start justify-between gap-1">
              <p className="text-xs font-medium">{card.shortLabel}</p>
              <Icon name={card.icon} />
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {metrics[card.metric].toLocaleString("es-PE")}
            </p>
          </Link>
        ))}
      </div>
      <p className="flex flex-wrap gap-x-4 text-sm text-slate-600">
        <Link
          className="inline-flex min-h-11 items-center text-blue-800 hover:underline"
          href="/empresas"
        >
          {metrics.companies} empresas activas
        </Link>
        <Link
          className="inline-flex min-h-11 items-center text-blue-800 hover:underline"
          href={`${destination}?${serializeReportFilters(addReportIndicator(filters, "pending"))}`}
        >
          {metrics.pending} obligaciones pendientes de aprobación
        </Link>
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <article className="rounded-xl border border-blue-200 bg-white p-3">
          <h2 className="text-sm font-medium text-blue-900">
            Cumplimiento documental
          </h2>
          <p className="mt-1 text-2xl font-semibold">
            {compliance(metrics.approved, metrics.required)}
          </p>
          <p className="text-xs text-slate-600">
            {metrics.approved} de {metrics.required} obligaciones obligatorias
            aprobadas.
          </p>
        </article>
        <article className="rounded-xl border border-violet-200 bg-white p-3">
          <h2 className="text-sm font-medium text-violet-900">
            Actividades adicionales
          </h2>
          <p className="mt-1 text-2xl font-semibold">
            {compliance(
              metrics.additional_approved,
              metrics.additional_required,
            )}
          </p>
          <p className="text-xs text-slate-600">
            {metrics.additional_approved} de {metrics.additional_required}{" "}
            actividades obligatorias aprobadas. Indicador separado.
          </p>
        </article>
      </div>
      <details className="text-xs text-slate-600">
        <summary className="min-h-11 cursor-pointer py-3">
          Cómo se calculan los indicadores
        </summary>
        <p>
          El cumplimiento suma obligaciones aprobadas y obligatorias, sin
          promediar porcentajes. Una entrega puntual pendiente de revisión no
          está vencida. Los atrasos pueden coexistir con observaciones o
          pendientes: los contadores no se suman.
        </p>
      </details>
    </section>
  );
}

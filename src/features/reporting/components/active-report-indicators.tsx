import Link from "next/link";

import { serializeReportFilters } from "@/domain/reporting/utils/report-filters";
import {
  activeReportIndicators,
  removeReportIndicator,
} from "@/domain/reporting/utils/report-indicators";
import { REPORT_INDICATORS } from "@/features/reporting/constants/report-indicators";
import type { ActiveReportIndicatorsProps } from "@/features/reporting/types/reporting-ui.types";

export function ActiveReportIndicators({
  filters,
  mode,
}: ActiveReportIndicatorsProps) {
  const active = activeReportIndicators(filters);
  if (!active.length) return null;
  const destination = mode === "report" ? "/reportes" : "/dashboard";
  return (
    <nav aria-label="Indicadores aplicados" className="space-y-2">
      <p className="text-sm text-zinc-600">
        Se muestran obligaciones que cumplen todos estos criterios:
      </p>
      <div className="flex flex-wrap gap-2">
        {REPORT_INDICATORS.filter((item) =>
          active.includes(item.indicator),
        ).map((item) => (
          <Link
            aria-label={`Quitar filtro: ${item.label}`}
            className="inline-flex min-h-11 items-center rounded-lg border border-zinc-300 px-3 text-sm hover:bg-zinc-50 focus-visible:outline-2"
            href={`${destination}?${serializeReportFilters(removeReportIndicator(filters, item.indicator))}`}
            key={item.indicator}
          >
            {item.label} · Quitar
          </Link>
        ))}
      </div>
    </nav>
  );
}

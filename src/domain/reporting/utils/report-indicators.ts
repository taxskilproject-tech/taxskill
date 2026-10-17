import { reportFiltersSchema } from "@/domain/reporting/contracts/reporting.schema";
import type {
  ReportFilters,
  ReportIndicator,
} from "@/domain/reporting/types/reporting.types";

export function activeReportIndicators(
  filters: ReportFilters,
): ReportIndicator[] {
  return [
    ...new Set([
      ...filters.indicators,
      ...(filters.indicator ? [filters.indicator] : []),
    ]),
  ].sort();
}

export function addReportIndicator(
  filters: ReportFilters,
  indicator: ReportIndicator,
): ReportFilters {
  return reportFiltersSchema.parse({
    ...filters,
    indicator: undefined,
    indicators: [...new Set([...activeReportIndicators(filters), indicator])],
    page: 1,
  });
}

export function removeReportIndicator(
  filters: ReportFilters,
  indicator: ReportIndicator,
): ReportFilters {
  return reportFiltersSchema.parse({
    ...filters,
    indicator: undefined,
    indicators: activeReportIndicators(filters).filter(
      (value) => value !== indicator,
    ),
    page: 1,
  });
}

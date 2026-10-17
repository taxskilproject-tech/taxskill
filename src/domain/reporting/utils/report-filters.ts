import { reportFiltersSchema } from "@/domain/reporting/contracts/reporting.schema";
import type { ReportFilters } from "@/domain/reporting/types/reporting.types";

export function parseReportFilters(parameters: URLSearchParams): ReportFilters {
  const raw = Object.fromEntries(parameters);
  delete raw.returnTo;
  return reportFiltersSchema.parse({
    ...raw,
    indicators: raw.indicators ? raw.indicators.split(",") : [],
    include_deleted: raw.include_deleted === "true",
  });
}

export function serializeReportFilters(filters: ReportFilters): string {
  const defaults = reportFiltersSchema.parse({});
  const entries = Object.entries(filters).filter(
    ([key, value]) =>
      value !== undefined &&
      value !== "" &&
      (!Array.isArray(value) || value.length > 0) &&
      value !== Reflect.get(defaults, key),
  );
  return new URLSearchParams(
    entries.map(([key, value]) => [key, String(value)]),
  ).toString();
}

export function compliance(approved: number, required: number): string {
  return required === 0
    ? "Sin obligaciones"
    : `${((approved / required) * 100).toLocaleString("es-PE", { maximumFractionDigits: 1 })}%`;
}

export function neutralizeSpreadsheetText(value: string): string {
  // Check compatibility characters and invisible prefixes; always write an explicit string cell too.
  const probe = value.normalize("NFKC").replace(/^[\s\p{Cc}\p{Cf}]+/u, "");
  return /^[=+\-@]/u.test(probe) ? `'${value}` : value;
}

export function limaMoment(value: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

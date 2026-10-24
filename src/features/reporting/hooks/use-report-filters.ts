"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { reportFiltersSchema } from "@/domain/reporting/contracts/reporting.schema";
import type { ReportFilterName } from "@/domain/reporting/types/reporting.types";
import { parseReportFilters } from "@/domain/reporting/utils/report-filters";
import { useCurrentRoute } from "@/features/access/hooks/use-current-route";
import { useWorkspace } from "@/features/auth/providers/workspace-context";

export function useReportFilters() {
  const { company } = useWorkspace();
  const parameters = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const origin = useCurrentRoute();
  let parsed = reportFiltersSchema.parse({});
  let error = "";
  try {
    parsed = parseReportFilters(new URLSearchParams(parameters.toString()));
  } catch {
    error =
      "Hay filtros inválidos en la dirección. Corrige los valores o limpia los filtros.";
  }
  const filters = reportFiltersSchema.parse({
    ...parsed,
    ...(company.kind === "company"
      ? { company_id: company.companyId, scope: "company" }
      : {}),
    ...(company.kind === "internal"
      ? { company_id: undefined, scope: "internal" }
      : {}),
  });
  function change(name: ReportFilterName, value: string) {
    const next = new URLSearchParams(parameters.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    if (name === "company_id") next.set("scope", value ? "company" : "all");
    if (name === "scope" && value === "internal") next.delete("company_id");
    if (name !== "page") next.delete("page");
    router.replace(`${pathname}?${next}`, { scroll: false });
  }
  return {
    filters,
    error,
    change,
    reset: () => router.replace(pathname, { scroll: false }),
    origin,
  };
}

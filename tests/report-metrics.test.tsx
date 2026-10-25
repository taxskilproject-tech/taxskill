import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

import { reportFiltersSchema } from "@/domain/reporting/contracts/reporting.schema";
import { parseReportFilters } from "@/domain/reporting/utils/report-filters";
import { activeReportIndicators } from "@/domain/reporting/utils/report-indicators";
import { ReportMetrics } from "@/features/reporting/components/report-metrics";

import { reportingPayload } from "./fixtures/reporting";

vi.mock("@/features/auth/providers/workspace-context", () => ({
  useWorkspace: () => ({
    context: {
      member: { is_admin: false },
      capabilities: [
        {
          company_id: "a7070000-0000-4000-8000-000000000003",
          module: "tributario",
          action: "view",
        },
        {
          company_id: "a7070000-0000-4000-8000-000000000004",
          module: "laboral_general",
          action: "reports.view",
        },
      ],
    },
  }),
}));

it.each(["dashboard", "report"] as const)(
  "keeps %s indicator links in the same authorized query universe",
  (mode) => {
    const filters = {
      ...reportingPayload.filters,
      company_id: "a7070000-0000-4000-8000-000000000003",
      module: "tributario" as const,
      year: 2026,
      month: 10,
      page: 3,
    };
    const html = renderToStaticMarkup(
      <ReportMetrics
        filters={filters}
        metrics={reportingPayload.metrics}
        mode={mode}
      />,
    );
    const links = [...html.matchAll(/href="([^"]+)"/g)]
      .map(
        (match) =>
          new URL(match[1].replaceAll("&amp;", "&"), "http://localhost"),
      )
      .filter((link) => link.pathname !== "/empresas");
    expect(links).toHaveLength(5);
    for (const link of links) {
      expect(link.pathname).toBe(
        mode === "report" ? "/reportes" : "/dashboard",
      );
      expect(link.searchParams.get("company_id")).toBe(filters.company_id);
      expect(link.searchParams.get("module")).toBe(filters.module);
      expect(link.searchParams.get("year")).toBe("2026");
      expect(link.searchParams.get("month")).toBe("10");
      expect(link.searchParams.has("page")).toBe(false);
    }
  },
);

it("keeps global and internal dashboards in dashboard scope despite partial report grants", () => {
  for (const scope of ["all", "internal"] as const) {
    const html = renderToStaticMarkup(
      <ReportMetrics
        filters={{ ...reportingPayload.filters, scope }}
        metrics={reportingPayload.metrics}
        mode="dashboard"
      />,
    );
    expect(html).toContain("/dashboard?");
    expect(html).not.toContain("/reportes?");
  }
});

it.each([
  "detail",
  "compliance",
  "pending",
  "deadlines",
  "observed",
  "period",
] as const)(
  "intersects every metric with the %s report and existing indicators",
  (report) => {
    const filters = reportFiltersSchema.parse({
      report,
      indicator: "review",
      indicators: ["upcoming"],
      company_id: "a7070000-0000-4000-8000-000000000003",
      scope: "company",
      module: "tributario",
      period: "2026-10",
      due_from: "2026-10-01",
      due_to: "2026-10-31",
      page: 3,
    });
    const html = renderToStaticMarkup(
      <ReportMetrics
        filters={filters}
        metrics={reportingPayload.metrics}
        mode="report"
      />,
    );
    const links = [...html.matchAll(/href="([^"]+)"/g)]
      .map(
        (match) =>
          new URL(match[1].replaceAll("&amp;", "&"), "http://localhost"),
      )
      .filter((link) => link.pathname === "/reportes")
      .slice(-5);
    expect(links).toHaveLength(5);
    for (const link of links) {
      const target = parseReportFilters(link.searchParams);
      expect({ ...target, indicator: undefined }).toMatchObject({
        ...filters,
        indicator: undefined,
        indicators: expect.any(Array),
        page: 1,
      });
      expect(activeReportIndicators(target)).toEqual(
        expect.arrayContaining(["review", "upcoming"]),
      );
    }
    expect(
      links.some((link) =>
        parseReportFilters(link.searchParams).indicators?.includes("pending"),
      ),
    ).toBe(true);
  },
);

it("removes one indicator without removing the report, scope or other criteria", () => {
  const filters = reportFiltersSchema.parse({
    report: "observed",
    indicator: "review",
    indicators: ["pending"],
    period: "2026-10",
  });
  const html = renderToStaticMarkup(
    <ReportMetrics
      filters={filters}
      metrics={reportingPayload.metrics}
      mode="dashboard"
    />,
  );
  const link = html.match(
    /aria-label="Quitar filtro: Archivos por revisar"[^>]*href="([^"]+)"/,
  );
  expect(link).not.toBeNull();
  const target = parseReportFilters(
    new URL(link![1].replaceAll("&amp;", "&"), "http://localhost").searchParams,
  );
  expect(target).toMatchObject({
    report: "observed",
    period: "2026-10",
    indicators: ["pending"],
  });
  expect(target.indicator).toBeUndefined();
});

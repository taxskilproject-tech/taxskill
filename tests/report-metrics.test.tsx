import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

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

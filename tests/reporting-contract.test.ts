import { strFromU8, unzipSync } from "fflate";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { expect, it } from "vitest";

import { reportFiltersSchema } from "@/domain/reporting/contracts/reporting.schema";
import {
  compliance,
  neutralizeSpreadsheetText,
  parseReportFilters,
  serializeReportFilters,
} from "@/domain/reporting/utils/report-filters";
import { safeReturnTo } from "@/features/auth/utils/safe-return-to";
import { generateExcel } from "@/features/reporting/services/excel-report";
import { fetchReportPages } from "@/features/reporting/services/export-pages";
import { generatePdf } from "@/features/reporting/services/pdf-report";
import { pdfText, wrapPdfText } from "@/features/reporting/utils/pdf-text";

import { reportingPayload, reportingRow } from "./fixtures/reporting";

it("uses the global numerator, with an explicit empty denominator", () => {
  expect(compliance(0, 0)).toBe("Sin obligaciones");
  expect(compliance(1, 10)).toBe("10%");
});
it.each([
  "=SUM(1,2)",
  "+1",
  "-4",
  "@SUM(1)",
  "\t\r=1",
  "\u200B=1",
  "\uFEFF＠SUM(1)",
  "\u0000 =1",
  "＝HYPERLINK(1)",
])("neutralizes formula prefix %j", (value) =>
  expect(neutralizeSpreadsheetText(value)).toMatch(/^'/),
);
it("preserves identifiers and ordinary text", () => {
  expect(neutralizeSpreadsheetText("00123456789")).toBe("00123456789");
  expect(neutralizeSpreadsheetText("Documento 01")).toBe("Documento 01");
});
it("rejects arbitrary filters, invalid dates and invalid pagination", () => {
  expect(() => parseReportFilters(new URLSearchParams("sql=secret"))).toThrow();
  expect(() =>
    parseReportFilters(
      new URLSearchParams("due_from=2026-11-01&due_to=2026-10-01"),
    ),
  ).toThrow();
  expect(reportFiltersSchema.safeParse({ pageSize: 12 }).success).toBe(false);
});
it("preserves whitelisted filters on navigation return", () => {
  const filters = reportFiltersSchema.parse({
    year: 2026,
    month: 10,
    include_deleted: true,
    indicator: "review",
  });
  const origin = `/reportes?${serializeReportFilters(filters)}`;
  expect(safeReturnTo(origin)).toBe(origin);
  expect(
    parseReportFilters(new URLSearchParams(serializeReportFilters(filters))),
  ).toEqual(filters);
});
it("round trips combined indicators and rejects unsupported predicates", () => {
  const filters = reportFiltersSchema.parse({
    report: "observed",
    indicators: ["review", "pending", "review"],
  });
  expect(filters.indicators).toEqual(["pending", "review"]);
  expect(
    parseReportFilters(new URLSearchParams(serializeReportFilters(filters))),
  ).toEqual(filters);
  expect(serializeReportFilters(reportFiltersSchema.parse({}))).toBe("");
  expect(() =>
    parseReportFilters(new URLSearchParams("indicators=review,sql")),
  ).toThrow();
  expect(reportFiltersSchema.safeParse({ indicators: "review" }).success).toBe(
    false,
  );
  expect(reportFiltersSchema.safeParse({ indicators: [null] }).success).toBe(
    false,
  );
});
it("writes strings, typed numbers and typed dates with no formula cells", async () => {
  const file = await generateExcel({
    ...reportingPayload,
    rows: [
      {
        ...reportingRow,
        title: "\t=HYPERLINK(1)",
        company_name: "\u200B＠SUM(1)",
      },
    ],
  });
  const zipped = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const xml = Object.entries(zipped)
    .filter(([name]) => name.endsWith(".xml"))
    .map(([, bytes]) => strFromU8(bytes))
    .join("\n");
  expect(xml).not.toMatch(/<f(?:\s|>)/);
  expect(xml).toContain("00123456789");
  expect(xml).toContain("00123456");
  const sheet = strFromU8(zipped["xl/worksheets/sheet1.xml"]);
  expect(sheet).toMatch(/r="O2"><v>1<\/v>/);
  expect(sheet).toMatch(/r="F2" s="\d+"><v>\d+<\/v>/);
});
it("wraps long values and preserves unsupported unicode visibly", async () => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  expect(
    wrapPdfText(
      "Trabajo muy extenso sin recorte ".repeat(10),
      80,
      font,
      8,
    ).every((line) => font.widthOfTextAtSize(line, 8) <= 80),
  ).toBe(true);
  expect(pdfText("José 😀")).toBe("José [U+1F600]");
  const blob = await generatePdf({
    ...reportingPayload,
    format: "pdf",
    rows: Array.from({ length: 50 }, () => ({
      ...reportingRow,
      title: "Descripción larga con José 😀 ".repeat(18),
    })),
  });
  expect(
    (await PDFDocument.load(await blob.arrayBuffer())).getPageCount(),
  ).toBeGreaterThan(2);
});
const result = {
  rows: [reportingRow],
  count: 1,
  fingerprint: "stable",
  queried_at: reportingPayload.queriedAt,
  metrics: reportingPayload.metrics,
  groups: [],
};
const options = {
  receipt: {
    filters: {},
    format: "xlsx" as const,
    count: 1,
    fingerprint: "stable",
    outcome: "started" as const,
  },
  filters: reportingPayload.filters,
  signal: new AbortController().signal,
  fetchPage: async () => result,
  onProgress: () => undefined,
};
it("keeps the fetched universe instead of exporting the visible page", async () => {
  const rows = Array.from({ length: 501 }, (_, index) => ({
    ...reportingRow,
    id: String(index),
  }));
  const fetched = await fetchReportPages({
    ...options,
    receipt: { ...options.receipt, count: 501 },
    fetchPage: async (input) => ({
      ...result,
      count: 501,
      rows: input.page === 1 ? rows.slice(0, 500) : rows.slice(500),
    }),
  });
  expect(fetched).toHaveLength(501);
});
it("rejects a failed batch, an incomplete batch and a changed fingerprint", async () => {
  await expect(
    fetchReportPages({
      ...options,
      fetchPage: async () => {
        throw new Error("network");
      },
    }),
  ).rejects.toThrow("network");
  await expect(
    fetchReportPages({
      ...options,
      fetchPage: async () => ({ ...result, rows: [] }),
    }),
  ).rejects.toThrow("incompleto");
  await expect(
    fetchReportPages({
      ...options,
      fetchPage: async () => ({ ...result, fingerprint: "changed" }),
    }),
  ).rejects.toThrow("cambiaron");
});
it("rejects cancellation before any request and after an active request", async () => {
  const controller = new AbortController();
  controller.abort();
  let called = false;
  await expect(
    fetchReportPages({
      ...options,
      signal: controller.signal,
      fetchPage: async () => {
        called = true;
        return result;
      },
    }),
  ).rejects.toThrow();
  expect(called).toBe(false);
  const active = new AbortController();
  await expect(
    fetchReportPages({
      ...options,
      signal: active.signal,
      fetchPage: async () => {
        active.abort();
        return result;
      },
    }),
  ).rejects.toThrow();
});
it("rejects a universe above the browser memory guard before requests", async () => {
  await expect(
    fetchReportPages({
      ...options,
      receipt: { ...options.receipt, count: 30001 },
    }),
  ).rejects.toThrow("filas por archivo");
});

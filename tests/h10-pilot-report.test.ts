import { afterEach, beforeEach, expect, it, vi } from "vitest";

import type { PilotReport } from "../scripts/sunat-worker/types/pilot.types";

const fixture = vi.hoisted(() => ({
  reports: new Array<PilotReport>(),
  connect: vi.fn(),
  close: vi.fn(),
  renew: vi.fn(),
  partial: false,
  storeFails: false,
}));
vi.mock("../scripts/sunat-worker/services/pilot-input", () => ({
  loadAuthorizedPilot: () => ({
    input: {
      pilot_reference: "pilot-99",
      scope: { connection_id: "fixture" },
      months: ["2026-10", "2026-09"],
    },
    credentials: {
      ruc: "20000000001",
      username: "fixture",
      password: "fixture-only",
    },
  }),
}));
vi.mock("../scripts/sunat-worker/source/sunat-source", () => ({
  OfficialSunatSource: class {
    records = new Map([
      [
        "notifications:fixture",
        { id: "fixture", published_on: "2026-10-15", has_attachments: true },
      ],
    ]);
    connect = fixture.connect;
    close = fixture.close;
    requestCount = () => 12;
    details = async () => ({ attachments: [{ locator: "fixture" }] });
    attachment = async () => ({
      bytes: Buffer.from("%PDF-fixture"),
      mime: "application/pdf",
    });
  },
}));
vi.mock("../scripts/sunat-worker/services/pilot-checks", () => ({
  pilotFirstPage: async () => ({ items: [{ id: "fixture" }] }),
  pageFingerprint: () => "stable-fixture",
  verifyReadEffect: async () => ({
    status: "not_demonstrated",
    reason: "NO_UNREAD_REFERENCE",
  }),
  verifySessionRenewal: () => fixture.renew(),
}));
vi.mock("../scripts/sunat-pilot/worker/services/run-monthly-query", () => ({
  runMonthlyMailboxQuery: async () => ({
    status: fixture.partial ? "partial" : "complete",
    reason: fixture.partial ? "PAGE_INCONSISTENT" : null,
    checkpoint: { items: [] },
    metrics: {
      duration_ms: 1,
      cpu_time_ms: 0,
      peak_memory_mb: 1,
      request_count: 1,
      pages_read: 1,
      pages_accepted: 1,
      session_renewals: 0,
    },
  }),
}));
vi.mock("../scripts/sunat-worker/utils/container-metrics", () => ({
  containerMetrics: () => ({ peak_memory_mb: null, cpu_time_ms: null }),
}));
vi.mock("../scripts/sunat-worker/repositories/pilot-report", () => ({
  writePilotReport: (report: PilotReport) => {
    if (fixture.storeFails) throw new Error("PILOT_REPORT_STORE_FAILED");
    fixture.reports = [...fixture.reports, structuredClone(report)];
  },
}));

const previousExitCode = process.exitCode;
beforeEach(() => {
  vi.resetModules();
  fixture.reports = [];
  fixture.partial = false;
  fixture.storeFails = false;
  fixture.connect.mockReset().mockResolvedValue(undefined);
  fixture.close.mockReset().mockResolvedValue(undefined);
  fixture.renew
    .mockReset()
    .mockResolvedValue({ renewed: true, stable_ids_after_renewal: true });
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  process.exitCode = previousExitCode;
  vi.restoreAllMocks();
});

it("conserva cuatro periodos y adjunto aunque falle la renovación posterior", async () => {
  fixture.renew.mockRejectedValue(new Error("private-source-message"));
  const { pilotRun } = await import("../scripts/sunat-worker/pilot");
  await pilotRun;
  const report = fixture.reports.at(-1);
  expect(report).toMatchObject({
    verified_identity: true,
    run_finished: false,
    source_validated: false,
    query_and_attachment_complete: true,
    cleanup: "closed",
    failure: { stage: "renewal", code: "SOURCE_UNAVAILABLE" },
    session: null,
    attachment: { bytes: 12, mime: "application/pdf" },
  });
  expect(report?.results).toHaveLength(4);
  expect(fixture.reports[0]?.verified_identity).toBe(false);
  expect(JSON.stringify(report)).not.toContain("private-source-message");
  expect(process.exitCode).toBe(1);
});

it("un fallo inicial deja evidencia sin inventar identidad o consultas", async () => {
  fixture.connect.mockRejectedValue(new Error("private-login-message"));
  await (
    await import("../scripts/sunat-worker/pilot")
  ).pilotRun;
  expect(fixture.reports.at(-1)).toMatchObject({
    verified_identity: false,
    run_finished: false,
    results: [],
    attachment: null,
    cleanup: "closed",
    failure: { stage: "connecting", code: "SOURCE_UNAVAILABLE" },
  });
  expect(fixture.renew).not.toHaveBeenCalled();
});

it("terminar las comprobaciones no convierte resultados parciales en cobertura completa", async () => {
  fixture.partial = true;
  await (
    await import("../scripts/sunat-worker/pilot")
  ).pilotRun;
  expect(fixture.reports.at(-1)).toMatchObject({
    run_finished: true,
    query_and_attachment_complete: false,
    source_validated: false,
    failure: null,
    cleanup: "closed",
    session: { renewed: true },
  });
  expect(process.exitCode).toBe(2);
});

it("informa limpieza fallida y conserva los resultados anteriores", async () => {
  fixture.close.mockRejectedValue(new Error("private-cleanup-message"));
  await (
    await import("../scripts/sunat-worker/pilot")
  ).pilotRun;
  expect(fixture.reports.at(-1)).toMatchObject({
    run_finished: false,
    cleanup: "failed",
    failure: { code: "PILOT_CLEANUP_FAILED" },
  });
  expect(fixture.reports.at(-1)?.results).toHaveLength(4);
  expect(process.exitCode).toBe(1);
});

it("un fallo de cierre no sobrescribe el motivo previo de renovación", async () => {
  fixture.renew.mockRejectedValue(new Error("private-renewal-error"));
  fixture.close.mockRejectedValue(new Error("private-close-error"));
  await (
    await import("../scripts/sunat-worker/pilot")
  ).pilotRun;
  expect(fixture.reports.at(-1)).toMatchObject({
    failure: { stage: "renewal", code: "SOURCE_UNAVAILABLE" },
    cleanup: "failed",
    cleanup_error: "PILOT_CLEANUP_FAILED",
    run_finished: false,
  });
});

it("un fallo al guardar el informe no se silencia ni declara un piloto correcto", async () => {
  fixture.storeFails = true;
  await (
    await import("../scripts/sunat-worker/pilot")
  ).pilotRun;
  expect(console.error).toHaveBeenCalledWith(
    JSON.stringify({
      event: "pilot_failed",
      code: "PILOT_REPORT_STORE_FAILED",
    }),
  );
  expect(fixture.connect).not.toHaveBeenCalled();
  expect(process.exitCode).toBe(1);
});

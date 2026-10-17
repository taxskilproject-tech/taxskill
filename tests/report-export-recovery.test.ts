import { afterEach, beforeEach, expect, it, vi } from "vitest";

import type { ExportReceipt } from "@/domain/reporting/types/reporting.types";
import {
  EXPORT_AUDIT_TIMEOUT_MS,
  EXPORT_RECONCILE_TIMEOUT_MS,
} from "@/features/reporting/constants/export-transport";
import { generateReport } from "@/features/reporting/services/report-export";

import { reportingPayload, reportingResult } from "./fixtures/reporting";
import type { ReportingRpcArguments } from "./types/reporting-test.types";

const mocks = vi.hoisted(() => ({ send: vi.fn(), worker: vi.fn() }));
vi.mock("@/features/access/repositories/access.repository", () => ({
  asJson: (value: unknown) => value,
  requireBrowserClient: () => ({
    rpc: (_name: string, input: ReportingRpcArguments) => ({
      abortSignal: (signal: AbortSignal) => mocks.send(input, signal),
    }),
  }),
}));
vi.mock("@/features/reporting/services/export-worker-client", () => ({
  generateReportInWorker: mocks.worker,
}));

const receipt: ExportReceipt = {
  filters: {},
  format: "xlsx",
  count: 1,
  fingerprint: "stable",
  outcome: "started",
};
const options = {
  organizationId: "a7070000-0000-4000-8000-000000000001",
  format: reportingPayload.format,
  filters: reportingPayload.filters,
  result: reportingResult,
  onProgress: vi.fn(),
};
function response(outcome: ExportReceipt["outcome"] = "started") {
  return { data: { ok: true, data: { ...receipt, outcome } }, error: null };
}
function normalResponse(input: ReportingRpcArguments) {
  if (input.p_resource)
    return { data: { ok: true, data: reportingResult }, error: null };
  const outcome = input.p_input.outcome;
  if (input.p_stage === "start") return response();
  return response(
    outcome === "cancelled"
      ? "cancelled"
      : outcome === "failed"
        ? "failed"
        : "generated",
  );
}
beforeEach(() => {
  mocks.send.mockReset().mockImplementation(normalResponse);
  mocks.worker.mockReset().mockResolvedValue(new Blob(["fixture"]));
});
afterEach(() => vi.useRealTimers());

it("keeps an explicit permission rejection without inventing an uncertain reservation", async () => {
  mocks.send.mockReturnValue({
    data: { ok: false, error: { code: "FORBIDDEN" } },
    error: null,
  });
  await expect(
    generateReport({ ...options, signal: new AbortController().signal }),
  ).rejects.toMatchObject({ name: "ExportAuditRejection", code: "FORBIDDEN" });
  expect(mocks.send).toHaveBeenCalledTimes(1);
  expect(mocks.worker).not.toHaveBeenCalled();
});

it("does not reserve an export cancelled before starting", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    generateReport({ ...options, signal: controller.signal }),
  ).rejects.toThrow();
  expect(mocks.send).not.toHaveBeenCalled();
});

it("interrupts a pending start even if transport ignores abort and settles the same request", async () => {
  const controller = new AbortController();
  mocks.send.mockReturnValueOnce(new Promise(() => undefined));
  const completed = expect(
    generateReport({ ...options, signal: controller.signal }),
  ).rejects.toMatchObject({ name: "AbortError" });
  controller.abort();
  await completed;
  const calls: ReportingRpcArguments[] = mocks.send.mock.calls.map(
    ([input]) => input,
  );
  expect(calls.map((input) => input.p_stage)).toEqual([
    "start",
    "start",
    "finish",
  ]);
  expect(new Set(calls.map((input) => input.p_request_id)).size).toBe(1);
  expect(calls[2].p_input.outcome).toBe("cancelled");
  expect(mocks.worker).not.toHaveBeenCalled();
});

it("bounds an unavailable registration and reports uncertainty without downloading", async () => {
  vi.useFakeTimers();
  mocks.send.mockReturnValue(new Promise(() => undefined));
  const completed = expect(
    generateReport({ ...options, signal: new AbortController().signal }),
  ).rejects.toThrow(/requiere conciliación.*Referencia:/);
  await vi.advanceTimersByTimeAsync(
    EXPORT_AUDIT_TIMEOUT_MS + EXPORT_RECONCILE_TIMEOUT_MS,
  );
  await completed;
  expect(mocks.worker).not.toHaveBeenCalled();
});

it("returns a prepared file only after the remote result is confirmed", async () => {
  const file = await generateReport({
    ...options,
    signal: new AbortController().signal,
  });
  expect(file.rows).toHaveLength(1);
  expect(file.blob).toBeInstanceOf(Blob);
  expect(mocks.send.mock.calls.map(([input]) => input.p_stage)).toEqual([
    "start",
    undefined,
    "finish",
  ]);
});

it.each(["batch", "worker"])(
  "cancels during %s and records a terminal cancellation",
  async (phase) => {
    const controller = new AbortController();
    if (phase === "batch")
      mocks.send.mockImplementation((input: ReportingRpcArguments) => {
        if (input.p_resource) controller.abort();
        return normalResponse(input);
      });
    if (phase === "worker")
      mocks.worker.mockImplementation(async () => {
        controller.abort();
        throw controller.signal.reason;
      });
    await expect(
      generateReport({ ...options, signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(mocks.send.mock.lastCall?.[0].p_input.outcome).toBe("cancelled");
  },
);

it("preserves a committed generated result when cancelling a lost finish response", async () => {
  const controller = new AbortController();
  let committed = false;
  mocks.send.mockImplementation((input: ReportingRpcArguments) => {
    if (input.p_stage === "finish") {
      committed = true;
      controller.abort();
      return new Promise(() => undefined);
    }
    return input.p_stage === "start" && committed
      ? response("generated")
      : normalResponse(input);
  });
  await expect(
    generateReport({ ...options, signal: controller.signal }),
  ).rejects.toThrow(/preparado en auditoría.*no se descargó/);
  expect(
    mocks.send.mock.calls.filter(([input]) => input.p_stage === "finish"),
  ).toHaveLength(1);
});

it("settles a cancelled finish that had not committed and does not send another generation", async () => {
  const controller = new AbortController();
  mocks.send.mockImplementation((input: ReportingRpcArguments) => {
    if (input.p_stage === "finish" && input.p_input.outcome === "generated") {
      controller.abort();
      return new Promise(() => undefined);
    }
    return normalResponse(input);
  });
  await expect(
    generateReport({ ...options, signal: controller.signal }),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(mocks.send.mock.lastCall?.[0].p_input.outcome).toBe("cancelled");
  expect(mocks.worker).toHaveBeenCalledTimes(1);
});

it("rechecks a lost cancellation receipt instead of overwriting a terminal result", async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  let committed = false;
  mocks.worker.mockImplementation(async () => {
    controller.abort();
    throw controller.signal.reason;
  });
  mocks.send.mockImplementation((input: ReportingRpcArguments) => {
    if (input.p_stage === "finish") {
      committed = true;
      return new Promise(() => undefined);
    }
    return input.p_stage === "start" && committed
      ? response("cancelled")
      : normalResponse(input);
  });
  const completed = expect(
    generateReport({ ...options, signal: controller.signal }),
  ).rejects.toMatchObject({ name: "AbortError" });
  await vi.advanceTimersByTimeAsync(EXPORT_RECONCILE_TIMEOUT_MS);
  await completed;
  expect(
    mocks.send.mock.calls.filter(([input]) => input.p_stage === "finish"),
  ).toHaveLength(1);
});

it("reports unavailable reconciliation after cancellation rather than claiming a confirmed result", async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  mocks.send.mockReturnValue(new Promise(() => undefined));
  const completed = expect(
    generateReport({ ...options, signal: controller.signal }),
  ).rejects.toThrow("requiere conciliación");
  controller.abort();
  await vi.advanceTimersByTimeAsync(EXPORT_RECONCILE_TIMEOUT_MS);
  await completed;
});

it("records generation failures and preserves their explicit error", async () => {
  mocks.worker.mockRejectedValue(new Error("Falló la generación PDF"));
  await expect(
    generateReport({ ...options, signal: new AbortController().signal }),
  ).rejects.toThrow("Falló la generación PDF");
  expect(mocks.send.mock.lastCall?.[0].p_input.outcome).toBe("failed");
});

import { randomUUID } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";

import { sunatCommandResultSchema } from "../src/domain/sunat/contracts/sunat.schema";
import { waitForSunatJob } from "../src/features/sunat-mailbox/repositories/sunat.repository";

const local = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("../src/features/access/repositories/access.repository", () => ({
  requireBrowserClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ abortSignal: () => ({ maybeSingle: local.read }) }),
      }),
    }),
  }),
}));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("vuelve a despertar el mismo trabajo si el primer despacho encontró ocupado el ejecutor", async () => {
  vi.useFakeTimers();
  const jobId = randomUUID();
  const organizationId = randomUUID();
  let reads = 0;
  local.read.mockImplementation(async () => ({
    error: null,
    data: {
      id: jobId,
      organization_id: organizationId,
      kind: "monthly",
      state: ++reads < 12 ? "queued" : "complete",
      error_code: null,
      created_at: new Date().toISOString(),
      finished_at: null,
      progress: {},
      from_date: "2026-10-01",
      through_date: "2026-10-31",
    },
  }));
  const fetch = vi.fn(async () =>
    Response.json({ ok: true, data: { accepted: true } }),
  );
  vi.stubGlobal("fetch", fetch);
  const input = sunatCommandResultSchema.parse({
    resource_id: randomUUID(),
    job_id: jobId,
    revision: 0,
    state: "queued",
  });
  const result = waitForSunatJob(input, new AbortController().signal);
  await vi.advanceTimersByTimeAsync(16000);
  expect(await result).toEqual({
    ok: true,
    data: { ...input, state: "complete" },
  });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch).toHaveBeenLastCalledWith(
    "/api/sunat/run",
    expect.objectContaining({
      body: JSON.stringify({ organization_id: organizationId, job_id: jobId }),
    }),
  );
});

import { createHmac } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { dispatchSunatRoute } from "../src/features/sunat-mailbox/services/dispatch-route.server";

const mocked = vi.hoisted(() => ({ consume: vi.fn(), schedule: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/supabase/admin.server", () => ({
  createSupabaseAdminClient: () => ({
    ok: true,
    data: {
      rpc: (...args: unknown[]) => ({
        abortSignal: () => mocked.consume(...args),
      }),
    },
  }),
}));
vi.mock(
  "../src/features/sunat-mailbox/services/schedule-dispatch.server",
  () => ({
    scheduleSunatDispatch: mocked.schedule,
  }),
);

const secret = "ab".repeat(32);
const nonce = "05ded810-8bc1-4192-a205-eeaa1889929a";
function request(issued = Math.floor(Date.now() / 1000), invalid = false) {
  const signature = createHmac("sha256", secret)
    .update(`v1:${nonce}:${issued}:sunat.dispatch`)
    .digest("hex");
  return new Request("https://example.invalid/api/sunat/dispatch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-TaxSkill-Signature": invalid ? "a".repeat(64) : signature,
    },
    body: JSON.stringify({
      schema_version: 1,
      action: "sunat.dispatch",
      nonce,
      issued_at: issued,
    }),
  });
}
beforeEach(() => {
  vi.stubEnv("SUNAT_DISPATCH_SECRET", secret);
  vi.stubEnv("SUNAT_DAILY_ENABLED", "true");
  mocked.consume.mockReset().mockResolvedValue({ data: true, error: null });
  mocked.schedule.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

it("consume el nonce antes de programar un único trabajo", async () => {
  expect((await dispatchSunatRoute(request())).status).toBe(200);
  expect(mocked.consume).toHaveBeenCalledWith(
    "h10_dispatch_consume_nonce",
    expect.objectContaining({ p_nonce: nonce }),
  );
  expect(mocked.schedule).toHaveBeenCalledWith(
    expect.anything(),
    true,
    expect.any(Number),
  );
});
it("un replay ya consumido no crea otra VM", async () => {
  mocked.consume.mockResolvedValue({ data: false, error: null });
  expect((await dispatchSunatRoute(request())).status).toBe(200);
  expect(mocked.schedule).not.toHaveBeenCalled();
});
it("rechaza firma falsa y caducada sin acceder a la base", async () => {
  expect((await dispatchSunatRoute(request(undefined, true))).status).toBe(401);
  expect(
    (await dispatchSunatRoute(request(Math.floor(Date.now() / 1000) - 91)))
      .status,
  ).toBe(401);
  expect(mocked.consume).not.toHaveBeenCalled();
});
it("un fallo de consumo no autoriza la ejecución", async () => {
  mocked.consume.mockResolvedValue({
    data: null,
    error: { code: "DEPENDENCY_UNAVAILABLE" },
  });
  expect((await dispatchSunatRoute(request())).status).toBe(503);
  expect(mocked.schedule).not.toHaveBeenCalled();
});
it("rechaza campos extra y cuerpos excesivos", async () => {
  for (const body of [
    JSON.stringify({ company_id: nonce }),
    " ".repeat(16385),
  ]) {
    const input = new Request("https://example.invalid/api/sunat/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    expect((await dispatchSunatRoute(input)).status).toBe(422);
  }
  expect(mocked.consume).not.toHaveBeenCalled();
});

import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { handleReceipt } from "../src/features/integrations/services/receipt-route.server";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/supabase/admin.server", () => ({
  createSupabaseAdminClient: () => ({ ok: true, data: { rpc: mocks.rpc } }),
}));
const token = "h08-test-token-for-receipt-at-least-32-characters";

function request() {
  return new Request("https://app.test/api/integrations/n8n/receipts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      schema_version: "1.0",
      receipt_id: randomUUID(),
      delivery_id: randomUUID(),
      status: "unknown",
      occurred_at: new Date().toISOString(),
      error_code: "PROVIDER_AMBIGUOUS",
    }),
  });
}
beforeEach(() => {
  mocks.rpc.mockReset();
  vi.stubEnv("N8N_RECEIPT_TOKEN", token);
});
afterEach(() => vi.unstubAllEnvs());

it("rechaza con 429 antes de aplicar el receipt al alcanzar el límite durable", async () => {
  mocks.rpc.mockResolvedValue({ data: false, error: null });
  const response = await handleReceipt(request());
  expect(response.status).toBe(429);
  expect(response.headers.get("Retry-After")).toBe("60");
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
  expect(mocks.rpc.mock.calls[0][0]).toBe("h08_consume_rate_limit");
});
it("falla de forma explícita si no puede consultar el límite", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { message: "offline" } });
  expect((await handleReceipt(request())).status).toBe(503);
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
});
it("no almacena tokens ni teléfonos en la identidad del límite", async () => {
  mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
  await handleReceipt(request());
  expect(mocks.rpc.mock.calls[0][1].p_key_hash).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain(token);
});

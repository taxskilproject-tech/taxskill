import { afterEach, describe, expect, it, vi } from "vitest";

import { handleReceipt } from "../src/features/integrations/services/receipt-route.server";
import { readReceiptBody } from "../src/features/integrations/utils/read-receipt-body.server";
import { verifyReceiptSecret } from "../src/features/integrations/utils/verify-receipt-secret.server";

vi.mock("server-only", () => ({}));
vi.mock("../src/lib/supabase/admin.server", () => ({
  createSupabaseAdminClient: vi.fn(() => {
    throw new Error("Test must reject before database access");
  }),
}));
const token = "test-h06-receipt-token-with-at-least-32-characters";
afterEach(() => vi.unstubAllEnvs());
describe("H06 receipt server boundary", () => {
  it("uses separate constant-time bearer authentication", () => {
    expect(verifyReceiptSecret(null, token)).toBe(false);
    expect(verifyReceiptSecret(`Bearer ${token}`, token)).toBe(true);
    expect(verifyReceiptSecret("Bearer wrong", token)).toBe(false);
    expect(verifyReceiptSecret(`Basic ${token}`, token)).toBe(false);
  });
  it("fails closed when production secret is not configured", async () => {
    vi.stubEnv("N8N_RECEIPT_TOKEN", "");
    expect(
      (
        await handleReceipt(
          new Request("https://app.test/api", { method: "POST" }),
        )
      ).status,
    ).toBe(503);
  });
  it("rejects an unauthenticated callback before reading its body", async () => {
    vi.stubEnv("N8N_RECEIPT_TOKEN", token);
    expect(
      (
        await handleReceipt(
          new Request("https://app.test/api", {
            method: "POST",
            body: "not json",
          }),
        )
      ).status,
    ).toBe(401);
  });
  it.each([
    ["text/plain", "{}", 415],
    ["application/json", "{", 422],
    ["application/json", "{}", 422],
    ["application/json", "x".repeat(8193), 413],
  ])(
    "rejects invalid or oversized content",
    async (contentType, body, status) => {
      vi.stubEnv("N8N_RECEIPT_TOKEN", token);
      const response = await handleReceipt(
        new Request("https://app.test/api", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": String(contentType),
          },
          body: String(body),
        }),
      );
      expect(response.status).toBe(status);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    },
  );
  it("bounds real UTF-8 bytes, including an unknown content length", async () => {
    await expect(
      readReceiptBody(
        new Request("https://app.test", {
          method: "POST",
          body: JSON.stringify({ data: "ñ".repeat(5000) }),
        }),
      ),
    ).rejects.toThrow("FILE_TOO_LARGE");
  });
});

import { createClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Database } from "../src/lib/supabase/types/database.types";
import { dispatchBatch } from "../supabase/functions/notification-operations/dispatch";
import { runNotificationCycle } from "../supabase/functions/notification-operations/run";

vi.mock("../supabase/functions/notification-operations/dispatch.ts", () => ({
  dispatchBatch: vi.fn(async () => ({ status: "idle" })),
}));
const environment = {
  appBaseUrl: "https://app.example.test",
  webhookUrl: "https://n8n.example.test/webhook",
  webhookToken: "synthetic-token-no-network",
};

function clientWithResponses(
  deadlineStatus: number,
  preparationStatus = 200,
  pageStatus = "pending",
  preparationPageStatus = pageStatus,
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (!url.startsWith("http://127.0.0.1:54331/rest/v1/rpc/h06_"))
        throw new Error("NETWORK_BLOCKED");
      const status = url.endsWith("h06_run_deadlines")
        ? deadlineStatus
        : preparationStatus;
      const body =
        status === 200
          ? {
              status: url.endsWith("h06_run_deadlines")
                ? pageStatus
                : preparationPageStatus,
              has_more: true,
            }
          : { code: "57014", message: "timeout", details: null, hint: null };
      return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
    }),
  );
  return createClient<Database>(
    "http://127.0.0.1:54331",
    "synthetic-service-key",
    { auth: { persistSession: false } },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("aislamiento del procesador de avisos y el despacho", () => {
  it("despacha otros resúmenes y comunica degradación si falla la página de avisos", async () => {
    const result = await runNotificationCycle(
      clientWithResponses(500),
      environment,
    );
    expect(result.status).toBe("degraded");
    expect(dispatchBatch).toHaveBeenCalledOnce();
  });
  it("permite continuar un barrido paginado sin bloquear el despacho", async () => {
    expect(
      (await runNotificationCycle(clientWithResponses(200), environment))
        .status,
    ).toBe("completed");
    expect(dispatchBatch).toHaveBeenCalledOnce();
  });
  it("hace visible una página con fallos persistidos aunque SQL responda 200", async () => {
    expect(
      (
        await runNotificationCycle(
          clientWithResponses(200, 200, "failed"),
          environment,
        )
      ).status,
    ).toBe("degraded");
    expect(dispatchBatch).toHaveBeenCalledOnce();
  });
  it("despacha resúmenes durables y comunica degradación si falla la preparación", async () => {
    const result = await runNotificationCycle(
      clientWithResponses(200, 500),
      environment,
    );
    expect(result.status).toBe("degraded");
    expect(result.dispatch).toEqual({ status: "idle" });
    expect(dispatchBatch).toHaveBeenCalledOnce();
  });
  it("señala un fallo persistido de preparación aunque su transporte devuelva 200", async () => {
    const result = await runNotificationCycle(
      clientWithResponses(200, 200, "pending", "failed"),
      environment,
    );
    expect(result.status).toBe("degraded");
    expect(dispatchBatch).toHaveBeenCalledOnce();
  });
  it("propaga el fallo del despacho sin afirmar que se completó", async () => {
    vi.mocked(dispatchBatch).mockRejectedValueOnce(
      new Error("DEPENDENCY_UNAVAILABLE"),
    );
    await expect(
      runNotificationCycle(clientWithResponses(200, 500), environment),
    ).rejects.toThrow("DEPENDENCY_UNAVAILABLE");
  });
});

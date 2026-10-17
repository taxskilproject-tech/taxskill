import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer } from "node:http";
import { parseEnv } from "node:util";
import { loadEnvConfig } from "@next/env";
import { z } from "zod";

import { whatsappBatchSchema } from "../../src/domain/integrations/contracts/whatsapp.schema";
import type { H06MockState } from "../types/h06.types";
import { requireLocalTestEnvironment } from "../utils/require-local-test-environment";

loadEnvConfig(process.cwd());
requireLocalTestEnvironment();
const secrets = parseEnv(
  readFileSync(".env.h06-operations.docker.local", "utf8"),
);
const statePath = "test-results/local/h06-provider-state.json";
const modeSchema = z.enum([
  "sent",
  "delivered",
  "failed",
  "unknown",
  "timeout",
]);
const stateSchema = z.object({
  providerMode: modeSchema,
  faults: z.array(
    z.union([
      z.number().int().min(400).max(599),
      z.literal("lost_response"),
      z.literal("timeout"),
    ]),
  ),
  providerCalls: z.record(
    z.string(),
    z.object({
      count: z.number(),
      status: z.string(),
      provider_message_id: z.string(),
      occurred_at: z.string(),
    }),
  ),
  dispatchCalls: z.array(
    z.object({ batch_id: z.string(), hash: z.string(), at: z.string() }),
  ),
});
let state: H06MockState = existsSync(statePath)
  ? stateSchema.parse(JSON.parse(readFileSync(statePath, "utf8")))
  : {
      providerMode: "delivered",
      faults: [],
      providerCalls: {},
      dispatchCalls: [],
    };
function persist() {
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}
function respond(response: ServerResponse, body: unknown, status = 200) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}
async function body(request: IncomingMessage) {
  let bytes = 0;
  let raw = "";
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += value.length;
    if (bytes > 2000000) throw new Error("BODY_LIMIT");
    raw += value.toString("utf8");
  }
  return JSON.parse(raw);
}
async function dispatch(request: IncomingMessage, response: ServerResponse) {
  const batch = whatsappBatchSchema.parse(await body(request));
  const raw = JSON.stringify(batch);
  const fault = state.faults[0];
  state = {
    ...state,
    faults: state.faults.slice(1),
    dispatchCalls: [
      ...state.dispatchCalls,
      {
        batch_id: batch.batch_id,
        hash: createHash("sha256").update(raw).digest("hex"),
        at: new Date().toISOString(),
      },
    ],
  };
  persist();
  if (typeof fault === "number") {
    respond(response, { error: "SIMULATED_TRANSPORT_FAILURE" }, fault);
    return;
  }
  if (fault === "timeout") {
    setTimeout(
      () => respond(response, { error: "SIMULATED_TIMEOUT" }, 503),
      6500,
    );
    return;
  }
  const forwarded = await fetch(
    "http://127.0.0.1:5679/webhook/taxskill-whatsapp-digest",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secrets.N8N_WEBHOOK_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: raw,
      signal: AbortSignal.timeout(30000),
    },
  );
  const result: unknown = await forwarded.json();
  if (fault === "lost_response") {
    response.destroy();
    return;
  }
  respond(response, result, forwarded.status);
}
async function provider(request: IncomingMessage, response: ServerResponse) {
  const input = z
    .object({
      delivery_id: z.uuid(),
      phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
      text: z.string().min(1),
    })
    .strict()
    .parse(await body(request));
  const count = (state.providerCalls[input.delivery_id]?.count ?? 0) + 1;
  const proof = {
    count,
    status: state.providerMode === "timeout" ? "delivered" : state.providerMode,
    provider_message_id: `local-provider:${input.delivery_id}:${count}`,
    occurred_at: new Date().toISOString(),
  };
  state = {
    ...state,
    providerCalls: { ...state.providerCalls, [input.delivery_id]: proof },
  };
  persist();
  if (state.providerMode === "timeout") {
    setTimeout(() => respond(response, proof), 6500);
    return;
  }
  respond(response, proof);
}
async function handle(request: IncomingMessage, response: ServerResponse) {
  const token =
    request.url === "/dispatch"
      ? secrets.N8N_WEBHOOK_TOKEN
      : secrets.H06_PROVIDER_TOKEN;
  if (request.headers.authorization !== `Bearer ${token}`) {
    respond(response, { error: "UNAUTHENTICATED" }, 401);
    return;
  }
  if (request.method === "GET" && request.url === "/state") {
    respond(response, state);
    return;
  }
  if (request.method === "POST" && request.url === "/configure") {
    const options = z
      .object({
        providerMode: modeSchema.optional(),
        faults: stateSchema.shape.faults.optional(),
        reset: z.boolean().optional(),
      })
      .strict()
      .parse(await body(request));
    state = {
      providerMode: options.providerMode ?? state.providerMode,
      faults: options.faults ?? [],
      providerCalls: options.reset ? {} : state.providerCalls,
      dispatchCalls: options.reset ? [] : state.dispatchCalls,
    };
    persist();
    respond(response, { configured: true });
    return;
  }
  if (request.method === "POST" && request.url === "/dispatch") {
    await dispatch(request, response);
    return;
  }
  if (request.method === "POST" && request.url === "/send") {
    await provider(request, response);
    return;
  }
  respond(response, { error: "NOT_FOUND" }, 404);
}
createServer((request, response) => {
  void handle(request, response).catch(() =>
    respond(response, { error: "LOCAL_TEST_DEPENDENCY" }, 500),
  );
}).listen(5680, "0.0.0.0", () =>
  console.info(
    "Proveedor y transporte de prueba H06 disponibles en puerto local 5680; sin WhatsApp real ni logs de contactos.",
  ),
);

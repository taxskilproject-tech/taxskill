import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, it, vi } from "vitest";

import {
  encryptSunatCredentials,
  parseSunatKeyring,
} from "@/features/sunat-mailbox/services/credentials-crypto.server";
import type { Database } from "@/lib/supabase/types/database.types";

import { MailboxError } from "../scripts/sunat-pilot/worker/services/mailbox-error";
import { claimedJobSchema } from "../scripts/sunat-worker/contracts/worker.schema";
import { runClaimedSunatJob } from "../scripts/sunat-worker/services/run-job";
import type {
  SourceRecord,
  SunatSource,
} from "../scripts/sunat-worker/types/source.types";

async function exerciseDeadline(revoked: boolean) {
  const scope = {
    organization_id: randomUUID(),
    company_id: randomUUID(),
    connection_id: randomUUID(),
    credential_version: 1,
  };
  const keys = parseSunatKeyring(
    "fixture",
    JSON.stringify({ fixture: "ab".repeat(32) }),
  );
  const credentials = {
    ruc: "20000000001",
    username: "fixture",
    password: "fixture-only",
  };
  const claim = claimedJobSchema.parse({
    job: {
      ...scope,
      id: randomUUID(),
      lease_token: randomUUID(),
      kind: "verify",
      from_date: null,
      through_date: null,
      checkpoint: {},
    },
    company: { id: scope.company_id, ruc: credentials.ruc },
    connection: { consented_at: new Date().toISOString(), consent_version: 1 },
    encrypted: encryptSunatCredentials(credentials, scope, keys),
    message: null,
    attachment: null,
  });
  const requests: string[] = [];
  const client = createClient<Database>(
    "http://127.0.0.1:54431",
    "fixture-only",
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (input, init) => {
          const url = new URL(
            typeof input === "string"
              ? input
              : input instanceof URL
                ? input.href
                : input.url,
          );
          if (typeof init?.body === "string") requests.push(init.body);
          const heartbeat = url.pathname.endsWith("h10_worker_heartbeat");
          return new Response(revoked && heartbeat ? "false" : "true", {
            headers: { "content-type": "application/json" },
          });
        },
      },
    },
  );
  const connecting = Promise.withResolvers<void>();
  const source: SunatSource = {
    records: new Map<string, SourceRecord>(),
    connect: () => connecting.promise,
    close: async () => connecting.reject(new MailboxError("SESSION_EXPIRED")),
    readPage: async () => {
      throw new Error("UNUSED_PAGE");
    },
    details: async () => ({ text: "", attachments: [] }),
    attachment: async () => {
      throw new Error("UNUSED_ATTACHMENT");
    },
    renewSession: async () => undefined,
    requestCount: () => 0,
  };
  const running = runClaimedSunatJob(claim, { client, source }, keys);
  await vi.advanceTimersByTimeAsync(revoked ? 20000 : 180000);
  expect(await running).toBe("failed");
  return requests;
}

it("registra WORKER_TIMEOUT cuando vence el límite con permisos todavía vigentes", async () => {
  vi.useFakeTimers();
  try {
    const requests = await exerciseDeadline(false);
    expect(
      requests.some((body) => body.includes('"p_error_code":"WORKER_TIMEOUT"')),
    ).toBe(true);
    expect(
      requests.some((body) => body.includes('"p_error_code":"ACCESS_REVOKED"')),
    ).toBe(false);
  } finally {
    vi.useRealTimers();
  }
});

it("conserva ACCESS_REVOKED cuando el heartbeat retira el acceso", async () => {
  vi.useFakeTimers();
  try {
    const requests = await exerciseDeadline(true);
    expect(
      requests.some((body) => body.includes('"p_error_code":"ACCESS_REVOKED"')),
    ).toBe(true);
  } finally {
    vi.useRealTimers();
  }
});

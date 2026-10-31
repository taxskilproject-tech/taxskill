import { createClient } from "@supabase/supabase-js";
import { expect, it } from "vitest";

import { mailboxLabJob } from "../scripts/sunat-pilot/worker/lab/helpers";
import { runMonthlyMailboxQuery } from "../scripts/sunat-pilot/worker/services/run-monthly-query";
import type { MailboxPage } from "../scripts/sunat-pilot/worker/types/mailbox.types";
import { workerCheckpointStore } from "../scripts/sunat-worker/repositories/worker-repository";
import type {
  SourceRecord,
  SunatSource,
} from "../scripts/sunat-worker/types/source.types";
import type { Database } from "../src/lib/supabase/types/database.types";
import { sunatWorkerClaimFixture } from "./fixtures/sunat-worker";

async function recoverIntoRepository(failWrite = false) {
  const claim = sunatWorkerClaimFixture();
  const job = mailboxLabJob({
    connection_key: claim.job.connection_id,
    mailbox: "messages",
  });
  const records = new Map<string, SourceRecord>();
  for (let index = 0; index < 17; index += 1) {
    const record = {
      id: "fixture-" + index,
      subject: "Registro sintético",
      published_on: "2026-10-15",
      read: true,
      has_attachments: false,
    };
    records.set("messages:" + record.id, record);
  }
  const page: MailboxPage = {
    connection_key: job.connection_key,
    mailbox: "messages",
    page: 1,
    page_size: 25,
    total: 54,
    start: 1,
    end: 25,
    order: "unverified",
    items: [...records.values()].map(
      ({ id, published_on, read, has_attachments }) => ({
        id,
        published_on,
        read,
        has_attachments,
      }),
    ),
  };
  const source: SunatSource = {
    records,
    connect: async () => undefined,
    close: async () => undefined,
    renewSession: async () => undefined,
    readPage: async () => page,
    requestCount: () => 0,
    details: async () => ({ text: "fixture", attachments: [] }),
    attachment: async () => {
      throw new Error("NOT_REQUESTED");
    },
  };
  const requests: unknown[] = [];
  const client = createClient<Database>(
    "http://127.0.0.1:54431",
    "fixture-only",
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (_input, init) => {
          if (typeof init?.body === "string")
            requests.push(JSON.parse(init.body));
          return new Response(failWrite ? "false" : "true", {
            headers: { "content-type": "application/json" },
          });
        },
      },
    },
  );
  const checkpoints = workerCheckpointStore(client, claim, source);
  const result = await runMonthlyMailboxQuery(job, {
    transport: source,
    checkpoints,
  });
  return { result, requests, checkpoints, job };
}

it("envía los registros disponibles a RPC sin certificar ni saltar la página", async () => {
  const { result, requests, checkpoints, job } = await recoverIntoRepository();
  expect(result.reason).toBe("PAGE_INCONSISTENT");
  expect(result.last_success_may_advance).toBe(false);
  expect(requests).toHaveLength(job.limits.max_attempts_per_page);
  for (const request of requests) {
    expect(request).toMatchObject({
      p_mailbox: "messages",
      p_checkpoint: { messages: { next_page: 1, complete: false, items: [] } },
      p_progress: { pages: 0, messages: 17 },
      p_records: expect.arrayContaining([
        expect.objectContaining({
          id: "fixture-0",
          subject: "Registro sintético",
        }),
      ]),
    });
  }
  expect(await checkpoints.load(job)).toMatchObject({
    next_page: 1,
    complete: false,
    items: [],
  });
});

it("un rechazo RPC no avanza el cache local ni oculta la pérdida de persistencia", async () => {
  const { result, requests, checkpoints, job } =
    await recoverIntoRepository(true);
  expect(result.reason).toBe("CHECKPOINT_STORE_FAILED");
  expect(requests).toHaveLength(1);
  expect(await checkpoints.load(job)).toBeNull();
  expect(result.last_success_may_advance).toBe(false);
});

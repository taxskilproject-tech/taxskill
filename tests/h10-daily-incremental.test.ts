import { expect, it } from "vitest";
import { z } from "zod";

import type {
  MailboxCheckpoint,
  MailboxCheckpointStore,
  MailboxReadRequest,
  MailboxTransport,
} from "../scripts/sunat-pilot/worker/types/mailbox.types";
import { claimedJobSchema } from "../scripts/sunat-worker/contracts/worker.schema";
import { workerCheckpointStore } from "../scripts/sunat-worker/repositories/worker-repository";
import { runDailyMailbox } from "../scripts/sunat-worker/services/run-daily-mailbox";
import type {
  SourceRecord,
  SunatSource,
} from "../scripts/sunat-worker/types/source.types";
import { workerMailboxJob } from "../scripts/sunat-worker/utils/mailbox-job";
import { sunatDispatchFixture } from "./fixtures/sunat-dispatch";
import { sunatWorkerClaimFixture } from "./fixtures/sunat-worker";

function dailyJob() {
  const original = sunatWorkerClaimFixture();
  return workerMailboxJob(
    claimedJobSchema.parse({
      ...original,
      job: { ...original.job, kind: "daily" },
    }),
    "notifications",
  );
}

function page(request: MailboxReadRequest, prefix = "") {
  const start = (request.page - 1) * 25 + 1;
  const end = Math.min(start + 24, 100);
  return {
    connection_key: request.connectionKey,
    mailbox: request.mailbox,
    page: request.page,
    page_size: 25,
    total: 100,
    start,
    end,
    order: "unverified",
    items: Array.from({ length: end - start + 1 }, (_, index) => ({
      id: prefix + (start + index),
      published_on: "2026-10-15",
      read: true,
      has_attachments: false,
    })),
  };
}

it("continúa desde el cursor guardado sin descargar otra vez las páginas anteriores", async () => {
  const calls: number[] = [];
  let stored: MailboxCheckpoint | null = null;
  const checkpoints: MailboxCheckpointStore = {
    load: async () => stored,
    save: async (_job, value) => {
      stored = value;
    },
  };
  const transport: MailboxTransport = {
    renewSession: async () => undefined,
    readPage: async (request) => {
      calls.push(request.page);
      return page(request);
    },
  };
  const job = dailyJob();
  const first = await runDailyMailbox(job, { checkpoints, transport });
  expect(first.reason).toBe("BUDGET_EXHAUSTED");
  expect(first.checkpoint.next_page).toBe(4);
  expect(first.last_success_may_advance).toBe(false);
  calls.length = 0;
  const second = await runDailyMailbox(
    { ...job, mode: "resume" },
    { checkpoints, transport },
  );
  expect(calls).toEqual([1, 4]);
  expect(second.status).toBe("complete");
  expect(second.checkpoint.items).toHaveLength(100);
  expect(second.last_success_may_advance).toBe(true);
});

it("si cambia el ancla reinicia dentro del presupuesto y no certifica cobertura parcial", async () => {
  let stored: MailboxCheckpoint | null = null;
  let prefix = "";
  const calls: number[] = [];
  const checkpoints: MailboxCheckpointStore = {
    load: async () => stored,
    save: async (_job, value) => {
      stored = value;
    },
  };
  const transport: MailboxTransport = {
    renewSession: async () => undefined,
    readPage: async (request) => {
      calls.push(request.page);
      return page(request, prefix);
    },
  };
  const job = dailyJob();
  await runDailyMailbox(job, { checkpoints, transport });
  prefix = "new-";
  calls.length = 0;
  const changed = await runDailyMailbox(
    { ...job, mode: "resume" },
    { checkpoints, transport },
  );
  expect(calls).toEqual([1, 1, 2]);
  expect(changed.reason).toBe("BUDGET_EXHAUSTED");
  expect(changed.last_success_may_advance).toBe(false);
  expect(
    changed.checkpoint.items.every((item) => item.id.startsWith(prefix)),
  ).toBe(true);
  expect(changed.checkpoint.items).toHaveLength(50);
  expect(changed.metrics.pages_read).toBe(3);
});

it("el reinicio persiste las primeras filas nuevas aunque el cursor anterior tuviera más registros", async () => {
  const original = sunatWorkerClaimFixture();
  const base = claimedJobSchema.parse({
    ...original,
    job: { ...original.job, kind: "daily" },
  });
  const job = workerMailboxJob(base, "notifications");
  const previous = await runDailyMailbox(job, {
    checkpoints: { load: async () => null, save: async () => undefined },
    transport: {
      renewSession: async () => undefined,
      readPage: async (request) => page(request),
    },
  });
  const claim = claimedJobSchema.parse({
    ...original,
    job: {
      ...original.job,
      kind: "daily",
      checkpoint: { notifications: previous.checkpoint, resume: true },
    },
  });
  const { client, requests } = sunatDispatchFixture();
  const records = new Map<string, SourceRecord>();
  const source: SunatSource = {
    records,
    connect: async () => undefined,
    close: async () => undefined,
    renewSession: async () => undefined,
    requestCount: () => 0,
    readPage: async (request) => {
      const result = page(request, "new-");
      result.items.forEach((item) =>
        records.set(request.mailbox + ":" + item.id, {
          ...item,
          subject: "Fixture",
        }),
      );
      return result;
    },
    details: async () => ({ text: "Fixture", attachments: [] }),
    attachment: async () => {
      throw new Error("NOT_REQUESTED");
    },
  };
  await runDailyMailbox(workerMailboxJob(claim, "notifications"), {
    transport: source,
    checkpoints: workerCheckpointStore(client, claim, source),
  });
  const batches = z
    .array(z.object({ p_records: z.array(z.object({ id: z.string() })) }))
    .parse(requests);
  expect(batches.map((batch) => batch.p_records.length)).toEqual([25, 25]);
  expect(batches[0].p_records[0].id).toBe("new-1");
  expect(batches[1].p_records[0].id).toBe("new-26");
});

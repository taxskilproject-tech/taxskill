import {
  MAILBOX_CHECKPOINT_MAX_ITEMS,
  MAILBOX_PAGE_SIZE,
} from "../constants/worker";
import { createFileMailboxCheckpoints } from "../repositories/file-checkpoints";
import { createLocalMailboxSimulatorTransport } from "../repositories/local-simulator-transport";
import { createExclusiveMailboxRunner } from "../services/exclusive-runner";
import { mailboxFailureCode } from "../services/mailbox-error";
import { runMonthlyMailboxQuery } from "../services/run-monthly-query";
import type { MailboxLabCheck } from "../types/lab.types";
import type {
  MailboxCheckpoint,
  MailboxTransport,
} from "../types/mailbox.types";
import { initialMailboxCheckpoint } from "../utils/checkpoint";
import { mailboxLabCheck, mailboxLabJob } from "./helpers";

async function checkCapacity(): Promise<MailboxLabCheck> {
  const job = mailboxLabJob({ from: "2026-10-01" });
  const ids = Array.from(
    { length: MAILBOX_CHECKPOINT_MAX_ITEMS },
    (_, index) => "large-" + index,
  );
  const checkpoint: MailboxCheckpoint = {
    ...initialMailboxCheckpoint(job),
    next_page: 201,
    total: 5025,
    order: "unverified",
    first_id: ids[0],
    last_date: "2026-09-01",
    seen_ids: ids,
  };
  const result = await runMonthlyMailboxQuery(
    { ...job, mode: "resume" },
    {
      checkpoints: {
        load: async () => checkpoint,
        save: async () => undefined,
      },
      transport: {
        async readPage(request) {
          const offset = (request.page - 1) * MAILBOX_PAGE_SIZE;
          return {
            connection_key: job.connection_key,
            mailbox: job.mailbox,
            page: request.page,
            page_size: 25,
            total: 5025,
            start: offset + 1,
            end: offset + 25,
            order: "unverified",
            items: Array.from({ length: 25 }, (_, index) => ({
              id: "large-" + (offset + index),
              published_on: "2026-09-01",
              has_attachments: false,
              read: true,
            })),
          };
        },
        renewSession: async () => undefined,
      },
    },
  );
  return mailboxLabCheck(
    "checkpoint_capacity_stops_without_losing_progress",
    result.reason === "CHECKPOINT_CAPACITY_REACHED" &&
      result.checkpoint.seen_ids.length === MAILBOX_CHECKPOINT_MAX_ITEMS,
  );
}

async function checkSequentialConnections(
  origin: string,
): Promise<MailboxLabCheck> {
  const source = createLocalMailboxSimulatorTransport(origin, "normal");
  let active = 0;
  let peak = 0;
  const transport: MailboxTransport = {
    async readPage(request) {
      active += 1;
      peak = Math.max(peak, active);
      try {
        return await source.readPage(request);
      } finally {
        active -= 1;
      }
    },
    renewSession: source.renewSession,
  };
  const run = createExclusiveMailboxRunner({
    transport,
    checkpoints: createFileMailboxCheckpoints("/results/checkpoints/sequence"),
  });
  const first = run(mailboxLabJob({ connection_key: "sequence-one" }));
  const second = run(mailboxLabJob({ connection_key: "sequence-two" }));
  const results = await Promise.all([first, second]);
  return mailboxLabCheck(
    "different_connections_run_sequentially",
    results.every((result) => result.status === "complete") && peak === 1,
  );
}

async function checkFutureConsent(): Promise<MailboxLabCheck> {
  const job = mailboxLabJob();
  let calls = 0;
  let rejected = false;
  try {
    await runMonthlyMailboxQuery(
      {
        ...job,
        read_effect_consent: {
          ...job.read_effect_consent,
          accepted_at: "2099-01-01T00:00:00Z",
        },
      },
      {
        checkpoints: { load: async () => null, save: async () => undefined },
        transport: {
          readPage: async () => {
            calls += 1;
            return null;
          },
          renewSession: async () => {
            calls += 1;
          },
        },
      },
    );
  } catch (error) {
    rejected = mailboxFailureCode(error) === "CONSENT_REQUIRED";
  }
  return mailboxLabCheck(
    "future_consent_cannot_authorize_requests",
    rejected && calls === 0,
  );
}

export async function checkMailboxEdges(
  origin: string,
): Promise<MailboxLabCheck[]> {
  return [
    await checkCapacity(),
    await checkSequentialConnections(origin),
    await checkFutureConsent(),
  ];
}

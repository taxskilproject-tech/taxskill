import {
  mailboxCheckpointSchema,
  mailboxJobSchema,
} from "../../sunat-pilot/worker/contracts/mailbox.schema";
import type { MailboxKind } from "../../sunat-pilot/worker/types/mailbox.types";
import {
  WORKER_DAILY_MAX_PAGES,
  WORKER_DAILY_MAX_REQUESTS,
  WORKER_MAILBOX_TIMEOUT_MS,
  WORKER_MONTHLY_MAX_PAGES,
  WORKER_MONTHLY_MAX_REQUESTS,
} from "../constants/runtime";
import type { ClaimedSunatJob } from "../types/worker.types";

export function workerMailboxJob(claim: ClaimedSunatJob, mailbox: MailboxKind) {
  const daily = claim.job.kind === "daily";
  const saved = mailboxCheckpointSchema.safeParse(
    claim.job.checkpoint[mailbox],
  );
  const resume =
    claim.job.checkpoint.resume === true &&
    !(daily && saved.success && saved.data.complete);
  return mailboxJobSchema.parse({
    connection_key: claim.job.connection_id,
    mailbox,
    from: claim.job.from_date,
    through: claim.job.through_date,
    read_effect_consent: {
      accepted: true,
      warning_version: 1,
      accepted_at: claim.connection.consented_at,
    },
    mode: resume ? "resume" : "refresh",
    limits: {
      max_pages: daily ? WORKER_DAILY_MAX_PAGES : WORKER_MONTHLY_MAX_PAGES,
      max_requests: daily
        ? WORKER_DAILY_MAX_REQUESTS
        : WORKER_MONTHLY_MAX_REQUESTS,
      max_duration_ms: WORKER_MAILBOX_TIMEOUT_MS,
      max_attempts_per_page: 2,
      request_timeout_ms: 15000,
    },
  });
}

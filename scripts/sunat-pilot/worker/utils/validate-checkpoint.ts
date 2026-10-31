import { MAILBOX_PAGE_SIZE } from "../constants/worker";
import { MailboxError } from "../services/mailbox-error";
import type { MailboxCheckpoint, MailboxJob } from "../types/mailbox.types";
import { checkpointMatchesJob } from "./checkpoint";

export function validateMailboxCheckpoint(
  checkpoint: MailboxCheckpoint,
  job: MailboxJob,
): void {
  if (!checkpointMatchesJob(checkpoint, job))
    throw new MailboxError("CHECKPOINT_INVALID");
  const ids = new Set(checkpoint.seen_ids);
  const selectedIds = new Set(checkpoint.items.map((item) => item.id));
  const expectedSeen = Math.min(
    (checkpoint.next_page - 1) * MAILBOX_PAGE_SIZE,
    checkpoint.total ?? 0,
  );
  const invalidItems = checkpoint.items.some(
    (item) =>
      !ids.has(item.id) ||
      item.published_on < job.from ||
      item.published_on > job.through,
  );
  if (
    ids.size !== checkpoint.seen_ids.length ||
    selectedIds.size !== checkpoint.items.length ||
    invalidItems ||
    checkpoint.seen_ids.length !== expectedSeen ||
    checkpoint.first_id !== (checkpoint.seen_ids[0] ?? null)
  )
    throw new MailboxError("CHECKPOINT_INVALID");
  if (
    checkpoint.total === null &&
    (checkpoint.next_page !== 1 || checkpoint.complete)
  )
    throw new MailboxError("CHECKPOINT_INVALID");
  const exhausted =
    checkpoint.total !== null && expectedSeen === checkpoint.total;
  const crossed =
    checkpoint.order === "published_desc" &&
    checkpoint.last_date !== null &&
    checkpoint.last_date < job.from;
  if (checkpoint.complete && !exhausted && !crossed)
    throw new MailboxError("CHECKPOINT_INVALID");
}

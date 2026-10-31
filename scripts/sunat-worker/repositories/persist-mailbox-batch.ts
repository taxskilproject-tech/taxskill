import { asJson } from "../../../src/lib/supabase/utils/as-json";
import { MailboxError } from "../../sunat-pilot/worker/services/mailbox-error";
import type {
  MailboxCheckpoint,
  MailboxItem,
  MailboxJob,
} from "../../sunat-pilot/worker/types/mailbox.types";
import type { WorkerCheckpointContext } from "../types/worker.types";

export async function persistMailboxBatch(
  context: WorkerCheckpointContext,
  job: MailboxJob,
  items: readonly MailboxItem[],
  checkpoint: MailboxCheckpoint,
): Promise<void> {
  const records = items.map((item) => {
    const record = context.source.records.get(job.mailbox + ":" + item.id);
    if (!record) throw new MailboxError("UNEXPECTED_RESPONSE");
    return record;
  });
  const next = { ...context.checkpoints, [job.mailbox]: checkpoint };
  const ids = new Set([
    ...(context.observed.get(job.mailbox) ?? []),
    ...checkpoint.items.map((item) => item.id),
    ...items.map((item) => item.id),
  ]);
  const response = await context.client.rpc("h10_worker_batch", {
    p_job_id: context.claim.job.id,
    p_lease_token: context.claim.job.lease_token,
    p_mailbox: job.mailbox,
    p_records: asJson(records),
    p_checkpoint: asJson(next),
    p_progress: { pages: checkpoint.next_page - 1, messages: ids.size },
  });
  if (response.error || !response.data)
    throw new MailboxError("CHECKPOINT_STORE_FAILED");
  context.checkpoints = next;
  context.observed.set(job.mailbox, ids);
}

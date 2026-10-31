import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../src/lib/supabase/types/database.types";
import { mailboxCheckpointSchema } from "../../sunat-pilot/worker/contracts/mailbox.schema";
import type {
  MailboxCheckpoint,
  MailboxItem,
  MailboxJob,
} from "../../sunat-pilot/worker/types/mailbox.types";
import type { SunatSource } from "../types/source.types";
import type {
  ClaimedSunatJob,
  WorkerCheckpointContext,
} from "../types/worker.types";
import { persistMailboxBatch } from "./persist-mailbox-batch";

export function workerCheckpointStore(
  client: SupabaseClient<Database>,
  claim: ClaimedSunatJob,
  source: SunatSource,
) {
  const context: WorkerCheckpointContext = {
    client,
    claim,
    source,
    checkpoints: { ...claim.job.checkpoint },
    previous: new Map(),
    observed: new Map(),
  };
  return {
    prepare: async (job: MailboxJob) => {
      if (job.mode !== "refresh") return;
      context.previous.set(job.mailbox, 0);
      context.observed.set(job.mailbox, new Set());
    },
    load: async (job: MailboxJob) => {
      const stored = context.checkpoints[job.mailbox] ?? null;
      const parsed = mailboxCheckpointSchema.safeParse(stored);
      if (
        claim.job.kind !== "daily" ||
        !parsed.success ||
        parsed.data.from !== job.from ||
        parsed.data.through > job.through
      )
        return stored;
      return { ...parsed.data, through: job.through };
    },
    savePartial: async (
      job: MailboxJob,
      items: readonly MailboxItem[],
      checkpoint: MailboxCheckpoint,
    ) => {
      await persistMailboxBatch(context, job, items, checkpoint);
    },
    save: async (job: MailboxJob, checkpoint: MailboxCheckpoint) => {
      const stored = mailboxCheckpointSchema.safeParse(
        context.checkpoints[job.mailbox],
      );
      const previousCount =
        context.previous.get(job.mailbox) ??
        (stored.success ? stored.data.items.length : 0);
      await persistMailboxBatch(
        context,
        job,
        checkpoint.items.slice(previousCount),
        checkpoint,
      );
      context.previous.set(job.mailbox, checkpoint.items.length);
    },
  };
}

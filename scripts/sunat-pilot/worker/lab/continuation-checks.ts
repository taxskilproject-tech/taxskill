import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  createFileMailboxCheckpoints,
  mailboxCheckpointKey,
} from "../repositories/file-checkpoints";
import { createLocalMailboxSimulatorTransport } from "../repositories/local-simulator-transport";
import { createExclusiveMailboxRunner } from "../services/exclusive-runner";
import { mailboxFailureCode } from "../services/mailbox-error";
import type { MailboxLabCheck } from "../types/lab.types";
import {
  mailboxLabCheck,
  mailboxLabJob,
  runMailboxLabScenario,
} from "./helpers";

export async function checkMailboxContinuations(
  origin: string,
): Promise<MailboxLabCheck[]> {
  const checks: MailboxLabCheck[] = [];
  const base = mailboxLabJob();
  const initial = await runMailboxLabScenario(
    origin,
    "normal",
    {
      limits: { ...base.limits, max_pages: 1 },
    },
    "resume",
  );
  checks.push(
    mailboxLabCheck(
      "page_budget_persists_continuation",
      initial.result.status === "partial" &&
        initial.result.checkpoint.next_page === 2,
    ),
  );
  const resumed = await runMailboxLabScenario(
    origin,
    "normal",
    { mode: "resume" },
    "resume",
  );
  checks.push(
    mailboxLabCheck(
      "resume_finishes_without_duplicate_rows",
      resumed.result.status === "complete" &&
        resumed.result.checkpoint.items.length === 45 &&
        new Set(resumed.result.checkpoint.seen_ids).size === 50,
    ),
  );
  checks.push(
    mailboxLabCheck(
      "resume_revalidates_first_page_anchor",
      resumed.result.metrics.pages_read === 2 &&
        resumed.result.metrics.pages_accepted === 1,
    ),
  );
  const completeFile = join(
    resumed.directory,
    mailboxCheckpointKey(resumed.job) + ".complete.json",
  );
  const previous = await readFile(completeFile, "utf8");
  const failedRefresh = await runMailboxLabScenario(
    origin,
    "persistent_empty",
    {},
    "resume",
  );
  checks.push(
    mailboxLabCheck(
      "failed_refresh_keeps_last_complete_snapshot",
      failedRefresh.result.status === "partial" &&
        (await readFile(completeFile, "utf8")) === previous,
    ),
  );
  await runMailboxLabScenario(
    origin,
    "normal",
    {
      limits: { ...base.limits, max_pages: 1 },
    },
    "drift",
  );
  const drift = await runMailboxLabScenario(
    origin,
    "anchor_changed",
    { mode: "resume" },
    "drift",
  );
  checks.push(
    mailboxLabCheck(
      "changed_anchor_blocks_unsafe_resume",
      drift.result.reason === "SOURCE_CHANGED" &&
        drift.result.checkpoint.next_page === 2,
    ),
  );
  const corruptFile = join(
    initial.directory,
    mailboxCheckpointKey(initial.job) + ".working.json",
  );
  await writeFile(corruptFile, "{invalid");
  const corrupt = await runMailboxLabScenario(
    origin,
    "normal",
    { mode: "resume" },
    "resume",
  );
  checks.push(
    mailboxLabCheck(
      "corrupt_checkpoint_is_explicit",
      corrupt.result.reason === "CHECKPOINT_INVALID" &&
        corrupt.result.metrics.request_count === 0,
    ),
  );
  const dependencies = {
    transport: createLocalMailboxSimulatorTransport(origin, "normal"),
    checkpoints: createFileMailboxCheckpoints("/results/checkpoints/exclusive"),
  };
  const run = createExclusiveMailboxRunner(dependencies);
  const first = run(base);
  const duplicate = run(base);
  checks.push(
    mailboxLabCheck("duplicate_click_reuses_same_job", first === duplicate),
  );
  let concurrentRejected = false;
  try {
    await run({ ...base, mailbox: "messages" });
  } catch (error) {
    concurrentRejected = mailboxFailureCode(error) === "JOB_ALREADY_RUNNING";
  }
  checks.push(
    mailboxLabCheck(
      "different_query_cannot_overlap_company",
      concurrentRejected,
    ),
  );
  await first;
  const next = await run({ ...base, connection_key: "second-local-company" });
  checks.push(
    mailboxLabCheck(
      "next_company_can_run_after_completion",
      next.status === "complete",
    ),
  );
  return checks;
}

import {
  MAILBOX_ATTENTION_FAILURES,
  MAILBOX_CHECKPOINT_MAX_ITEMS,
} from "../constants/worker";
import { mailboxCheckpointSchema } from "../contracts/mailbox.schema";
import type {
  MailboxJob,
  MailboxRunContext,
  MailboxRunDependencies,
  MailboxRunResult,
} from "../types/mailbox.types";
import {
  acceptMailboxPage,
  initialMailboxCheckpoint,
} from "../utils/checkpoint";
import { parseMailboxJob } from "../utils/parse-job";
import { validateMailboxCheckpoint } from "../utils/validate-checkpoint";
import { MailboxError, mailboxFailureCode } from "./mailbox-error";
import { readReliableMailboxPage } from "./read-page";

async function loadCheckpoint(
  job: MailboxJob,
  dependencies: MailboxRunDependencies,
) {
  if (job.mode === "refresh") return initialMailboxCheckpoint(job);
  const stored = await dependencies.checkpoints.load(job);
  if (stored === null) return initialMailboxCheckpoint(job);
  const parsed = mailboxCheckpointSchema.safeParse(stored);
  if (!parsed.success) throw new MailboxError("CHECKPOINT_INVALID");
  validateMailboxCheckpoint(parsed.data, job);
  return parsed.data;
}

function runResult(
  context: MailboxRunContext,
  reason: MailboxRunResult["reason"],
): MailboxRunResult {
  const cpu = process.cpuUsage(context.cpuStart);
  return {
    status:
      reason && MAILBOX_ATTENTION_FAILURES.has(reason)
        ? "requires_attention"
        : context.checkpoint.complete && !reason
          ? "complete"
          : "partial",
    reason,
    checkpoint: context.checkpoint,
    metrics: {
      duration_ms: Math.ceil(performance.now() - context.startedAt),
      cpu_time_ms: (cpu.user + cpu.system) / 1000,
      peak_memory_mb: Math.ceil(process.resourceUsage().maxRSS / 1024),
      request_count: context.requests,
      pages_read: context.pageRequests,
      pages_accepted: context.pages,
      session_renewals: context.sessionRenewals,
    },
    last_success_may_advance: context.checkpoint.complete && !reason,
  };
}

async function verifyResumeAnchor(context: MailboxRunContext): Promise<void> {
  if (context.checkpoint.next_page === 1 || context.checkpoint.complete) return;
  const saved = context.checkpoint;
  context.checkpoint = initialMailboxCheckpoint(context.job);
  try {
    const first = await readReliableMailboxPage(context, 1);
    if (first.total !== saved.total || first.items[0]?.id !== saved.first_id)
      throw new MailboxError("SOURCE_CHANGED");
  } finally {
    context.checkpoint = saved;
  }
}

async function consumePage(context: MailboxRunContext): Promise<void> {
  const page = await readReliableMailboxPage(
    context,
    context.checkpoint.next_page,
  );
  if (
    context.checkpoint.seen_ids.length + page.items.length >
    MAILBOX_CHECKPOINT_MAX_ITEMS
  )
    throw new MailboxError("CHECKPOINT_CAPACITY_REACHED");
  const accepted = acceptMailboxPage(context.checkpoint, page, context.job);
  await context.dependencies.checkpoints.save(context.job, accepted);
  context.checkpoint = accepted;
  context.pages += 1;
}

export async function runMonthlyMailboxQuery(
  input: unknown,
  dependencies: MailboxRunDependencies,
): Promise<MailboxRunResult> {
  const job = parseMailboxJob(input, Date.now());
  const context: MailboxRunContext = {
    job,
    dependencies,
    checkpoint: initialMailboxCheckpoint(job),
    requests: 0,
    pages: 0,
    pageRequests: 0,
    sessionRenewals: 0,
    startedAt: performance.now(),
    cpuStart: process.cpuUsage(),
    signal: AbortSignal.timeout(job.limits.max_duration_ms),
  };
  try {
    await dependencies.checkpoints.prepare?.(context.job);
    context.checkpoint = await loadCheckpoint(context.job, dependencies);
    await verifyResumeAnchor(context);
    while (
      !context.checkpoint.complete &&
      context.pages < context.job.limits.max_pages
    )
      await consumePage(context);
    return runResult(
      context,
      context.checkpoint.complete ? null : "BUDGET_EXHAUSTED",
    );
  } catch (error) {
    return runResult(context, mailboxFailureCode(error));
  }
}

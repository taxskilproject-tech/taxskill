import { MAILBOX_RETRYABLE_FAILURES } from "../constants/worker";
import { mailboxPageSchema } from "../contracts/mailbox.schema";
import type {
  MailboxFailureCode,
  MailboxRunContext,
} from "../types/mailbox.types";
import { partialMailboxItems } from "../utils/partial-page";
import { validateMailboxPage } from "../utils/validate-page";
import { MailboxError, mailboxFailureCode } from "./mailbox-error";

export function assertMailboxBudget(context: MailboxRunContext): void {
  const { limits } = context.job;
  if (
    context.requests >= limits.max_requests ||
    context.signal.aborted ||
    performance.now() - context.startedAt >= limits.max_duration_ms
  )
    throw new MailboxError("BUDGET_EXHAUSTED");
}

function requestSignal(context: MailboxRunContext): AbortSignal {
  return AbortSignal.any([
    context.signal,
    AbortSignal.timeout(context.job.limits.request_timeout_ms),
  ]);
}

async function attemptMailboxPage(context: MailboxRunContext, page: number) {
  assertMailboxBudget(context);
  context.requests += 1;
  context.pageRequests += 1;
  const payload = await context.dependencies.transport.readPage({
    connectionKey: context.job.connection_key,
    mailbox: context.job.mailbox,
    page,
    signal: requestSignal(context),
  });
  const result = mailboxPageSchema.safeParse(payload);
  if (!result.success) throw new MailboxError("UNEXPECTED_RESPONSE");
  try {
    validateMailboxPage(result.data, page, context.job, context.checkpoint);
  } catch (error) {
    if (mailboxFailureCode(error) !== "PAGE_INCONSISTENT") throw error;
    const items = partialMailboxItems(result.data, page, context.job);
    if (items.length)
      await context.dependencies.checkpoints.savePartial?.(
        context.job,
        items,
        context.checkpoint,
      );
    throw error;
  }
  return result.data;
}

async function renewMailboxSession(context: MailboxRunContext): Promise<void> {
  assertMailboxBudget(context);
  context.requests += 1;
  context.sessionRenewals += 1;
  await context.dependencies.transport.renewSession(requestSignal(context));
}

export async function readReliableMailboxPage(
  context: MailboxRunContext,
  page: number,
) {
  let attempts = 0;
  while (attempts < context.job.limits.max_attempts_per_page) {
    let code: MailboxFailureCode = "UNEXPECTED_RESPONSE";
    try {
      return await attemptMailboxPage(context, page);
    } catch (error) {
      code = mailboxFailureCode(error);
    }
    if (code === "SESSION_EXPIRED" && context.sessionRenewals === 0) {
      await renewMailboxSession(context);
      continue;
    }
    attempts += 1;
    if (
      !MAILBOX_RETRYABLE_FAILURES.has(code) ||
      attempts >= context.job.limits.max_attempts_per_page
    )
      throw new MailboxError(code);
  }
  throw new MailboxError("SOURCE_UNAVAILABLE");
}

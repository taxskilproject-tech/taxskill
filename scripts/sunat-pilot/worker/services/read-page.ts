import { MAILBOX_RETRYABLE_FAILURES } from "../constants/worker";
import { mailboxPageSchema } from "../contracts/mailbox.schema";
import type {
  MailboxPageReadOptions,
  MailboxRunContext,
} from "../types/mailbox.types";
import { initialMailboxCheckpoint } from "../utils/checkpoint";
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

async function attemptMailboxPage(
  context: MailboxRunContext,
  page: number,
  options: MailboxPageReadOptions,
) {
  assertMailboxBudget(context);
  context.requests += 1;
  context.pageRequests += 1;
  let received = null;
  try {
    const payload = await context.dependencies.transport.readPage({
      connectionKey: context.job.connection_key,
      mailbox: context.job.mailbox,
      page,
      signal: requestSignal(context),
    });
    const result = mailboxPageSchema.safeParse(payload);
    if (!result.success) throw new MailboxError("UNEXPECTED_RESPONSE");
    received = result.data;
    const checkpoint = options.anchor
      ? initialMailboxCheckpoint(context.job)
      : context.checkpoint;
    validateMailboxPage(
      result.data,
      page,
      context.job,
      options.recoveryTotal === undefined
        ? checkpoint
        : { ...checkpoint, total: options.recoveryTotal, last_date: null },
    );
    return result.data;
  } catch (error) {
    if (
      options.anchor ||
      !(error instanceof MailboxError) ||
      error.code !== "PAGE_INCONSISTENT"
    )
      throw error;
    const partial = received ?? error.partialPage;
    const items = partial
      ? partialMailboxItems(partial, page, context.job)
      : [];
    if (items.length)
      await context.dependencies.checkpoints.savePartial?.(
        context.job,
        items,
        context.checkpoint,
      );
    throw error;
  }
}

async function renewMailboxSession(context: MailboxRunContext): Promise<void> {
  assertMailboxBudget(context);
  context.requests += 1;
  context.sessionRenewals += 1;
  await context.dependencies.transport.renewSession(requestSignal(context));
}

async function readAttempt(
  context: MailboxRunContext,
  page: number,
  attempt: number,
  options: MailboxPageReadOptions,
) {
  try {
    return { page: await attemptMailboxPage(context, page, options) };
  } catch (cause) {
    const error =
      cause instanceof MailboxError
        ? cause
        : new MailboxError(mailboxFailureCode(cause));
    context.dependencies.onPageFailure?.({
      mailbox: context.job.mailbox,
      page,
      attempt,
      code: error.code,
      phase: "read",
      validation: error.validation,
    });
    return { error };
  }
}

export async function readReliableMailboxPage(
  context: MailboxRunContext,
  page: number,
  options: MailboxPageReadOptions = {},
) {
  let attempts = 0;
  let requestAttempt = 0;
  while (attempts < context.job.limits.max_attempts_per_page) {
    requestAttempt += 1;
    const result = await readAttempt(context, page, requestAttempt, options);
    if (result.page) return result.page;
    const { error } = result;
    if (error.code === "SESSION_EXPIRED" && context.sessionRenewals === 0) {
      await renewMailboxSession(context);
      continue;
    }
    attempts += 1;
    if (
      error.validation?.rule === "wrong_mailbox" ||
      !MAILBOX_RETRYABLE_FAILURES.has(error.code) ||
      attempts >= context.job.limits.max_attempts_per_page
    )
      throw error;
  }
  throw new MailboxError("SOURCE_UNAVAILABLE");
}

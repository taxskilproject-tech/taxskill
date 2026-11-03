import { MAILBOX_PAGE_SIZE } from "../constants/worker";
import type { MailboxRunContext } from "../types/mailbox.types";
import { partialMailboxItems } from "../utils/partial-page";
import { MailboxError, mailboxFailureCode } from "./mailbox-error";
import { readReliableMailboxPage } from "./read-page";

async function recoverPage(
  context: MailboxRunContext,
  page: number,
  total: number,
) {
  try {
    const result = await readReliableMailboxPage(context, page, {
      recoveryTotal: total,
    });
    const items = partialMailboxItems(result, page, context.job);
    if (items.length)
      await context.dependencies.checkpoints.savePartial?.(
        context.job,
        items,
        context.checkpoint,
      );
    return true;
  } catch (error) {
    if (
      error instanceof MailboxError &&
      error.validation?.recoverableTotal === total
    )
      return true;
    if (mailboxFailureCode(error) === "BUDGET_EXHAUSTED") return false;
    throw error;
  }
}

export async function recoverMailboxPages(
  context: MailboxRunContext,
  failure: unknown,
): Promise<void> {
  if (
    !(failure instanceof MailboxError) ||
    failure.code !== "PAGE_INCONSISTENT"
  )
    return;
  const total = failure.validation?.recoverableTotal;
  if (total === undefined || !context.dependencies.checkpoints.savePartial)
    return;
  const firstGap = context.checkpoint.next_page;
  const finalPage = Math.min(
    Math.ceil(total / MAILBOX_PAGE_SIZE),
    firstGap + context.job.limits.max_pages - context.pages - 1,
  );
  // Las páginas posteriores aportan registros, pero no certifican el tramo pendiente.
  for (let page = firstGap + 1; page <= finalPage; page += 1)
    if (!(await recoverPage(context, page, total))) return;
}

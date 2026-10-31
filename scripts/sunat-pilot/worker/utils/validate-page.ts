import { MAILBOX_PAGE_SIZE } from "../constants/worker";
import { MailboxError } from "../services/mailbox-error";
import type {
  MailboxCheckpoint,
  MailboxJob,
  MailboxPage,
} from "../types/mailbox.types";

export function validateMailboxPage(
  page: MailboxPage,
  requestedPage: number,
  job: MailboxJob,
  checkpoint: MailboxCheckpoint,
): void {
  if (
    page.connection_key !== job.connection_key ||
    page.mailbox !== job.mailbox ||
    page.page !== requestedPage
  )
    throw new MailboxError("UNEXPECTED_RESPONSE");
  const start =
    page.total === 0 ? 1 : (requestedPage - 1) * MAILBOX_PAGE_SIZE + 1;
  const end = Math.min(requestedPage * MAILBOX_PAGE_SIZE, page.total);
  const expectedCount = page.total === 0 ? 0 : end - start + 1;
  if (
    page.start !== start ||
    page.end !== end ||
    expectedCount < 0 ||
    page.items.length !== expectedCount
  )
    throw new MailboxError("PAGE_INCONSISTENT");
  if (new Set(page.items.map((item) => item.id)).size !== page.items.length)
    throw new MailboxError("PAGE_INCONSISTENT");
  if (page.items.some((item) => checkpoint.seen_ids.includes(item.id)))
    throw new MailboxError("SOURCE_CHANGED");
  if (checkpoint.total !== null && checkpoint.total !== page.total)
    throw new MailboxError("SOURCE_CHANGED");
  if (checkpoint.order !== null && checkpoint.order !== page.order)
    throw new MailboxError("SOURCE_CHANGED");
  if (page.order !== "published_desc") return;
  const dates = [
    checkpoint.last_date,
    ...page.items.map((item) => item.published_on),
  ].filter((date) => date !== null);
  if (dates.some((date, index) => index > 0 && dates[index - 1] < date))
    throw new MailboxError("PAGE_INCONSISTENT");
}

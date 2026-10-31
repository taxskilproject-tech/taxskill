import type {
  MailboxItem,
  MailboxJob,
  MailboxPage,
} from "../types/mailbox.types";

export function partialMailboxItems(
  page: MailboxPage,
  requestedPage: number,
  job: MailboxJob,
): MailboxItem[] {
  if (
    page.connection_key !== job.connection_key ||
    page.mailbox !== job.mailbox ||
    page.page !== requestedPage ||
    new Set(page.items.map((item) => item.id)).size !== page.items.length
  )
    return [];
  return page.items.filter(
    (item) => item.published_on >= job.from && item.published_on <= job.through,
  );
}

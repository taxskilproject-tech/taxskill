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
    page.page !== requestedPage
  )
    return [];
  const selected = page.items.filter(
    (item) => item.published_on >= job.from && item.published_on <= job.through,
  );
  return [...new Map(selected.map((item) => [item.id, item])).values()];
}

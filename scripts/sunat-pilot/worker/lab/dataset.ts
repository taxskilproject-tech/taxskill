import type { MailboxItem } from "../types/mailbox.types";

function datedItems(
  month: string,
  count: number,
  prefix: string,
): MailboxItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: prefix + String(index + 1).padStart(3, "0"),
    published_on: month + "-" + String(26 - index).padStart(2, "0"),
    has_attachments: index === 0,
    read: index % 2 === 0,
  }));
}

export function mailboxLabDataset(): MailboxItem[] {
  return [
    ...datedItems("2026-10", 20, "oct-"),
    ...datedItems("2026-09", 25, "sep-"),
    ...datedItems("2026-08", 15, "aug-"),
  ];
}

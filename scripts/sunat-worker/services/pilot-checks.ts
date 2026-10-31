import { createHash } from "node:crypto";

import type {
  MailboxKind,
  MailboxPage,
} from "../../sunat-pilot/worker/types/mailbox.types";
import type { OfficialSunatSource } from "../source/sunat-source";

export function pageFingerprint(page: MailboxPage): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        total: page.total,
        items: page.items.map((item) => [item.id, item.published_on]),
      }),
    )
    .digest("hex");
}

export function pilotFirstPage(
  source: OfficialSunatSource,
  connectionKey: string,
  mailbox: MailboxKind = "notifications",
) {
  return source.readPage({
    connectionKey,
    mailbox,
    page: 1,
    signal: AbortSignal.timeout(15000),
  });
}

async function observeReadState(
  source: OfficialSunatSource,
  connectionKey: string,
  mailbox: MailboxKind,
  sourceId: string,
) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const page = await pilotFirstPage(source, connectionKey, mailbox);
    const updated = page.items.find((item) => item.id === sourceId);
    if (updated?.read) return { read: true, checks: attempt };
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return { read: false, checks: 3 };
}

export async function verifyReadEffect(
  source: OfficialSunatSource,
  months: readonly string[],
  connectionKey: string,
) {
  const mailboxes: MailboxKind[] = ["notifications", "messages"];
  for (const mailbox of mailboxes) {
    const first = await pilotFirstPage(source, connectionKey, mailbox);
    const reference = first.items.find(
      (item) => !item.read && months.includes(item.published_on.slice(0, 7)),
    );
    if (!reference) continue;
    const detail = await source.details(mailbox, reference.id);
    const observation = await observeReadState(
      source,
      connectionKey,
      mailbox,
      reference.id,
    );
    return {
      status: observation.read
        ? "read_changed"
        : detail.source_marked_read === false
          ? "observed_unchanged"
          : "not_demonstrated",
      mailbox,
      source_reported_update: detail.source_marked_read ?? null,
      checks: observation.checks,
      reason:
        observation.read || detail.source_marked_read === false
          ? null
          : "SOURCE_READ_STATE_UNCHANGED",
    };
  }
  return { status: "not_demonstrated", reason: "NO_UNREAD_REFERENCE" };
}

export async function verifySessionRenewal(
  source: OfficialSunatSource,
  original: MailboxPage,
  connectionKey: string,
) {
  await source.renewSession(AbortSignal.timeout(45000));
  const after = await pilotFirstPage(source, connectionKey, original.mailbox);
  return {
    renewed: true,
    stable_ids_after_renewal:
      original.items.length > 0 &&
      pageFingerprint(after) === pageFingerprint(original),
  };
}

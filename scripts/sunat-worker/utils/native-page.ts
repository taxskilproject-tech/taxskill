import { MailboxError } from "../../sunat-pilot/worker/services/mailbox-error";
import type {
  MailboxKind,
  MailboxPage,
} from "../../sunat-pilot/worker/types/mailbox.types";
import { sunatPagePayloadSchema } from "../contracts/source.schema";
import type { SunatPagePayload } from "../types/source.types";
import { sourceDate } from "./source-validation";

export function mailboxType(mailbox: MailboxKind): number {
  return mailbox === "notifications" ? 2 : 1;
}

function consistentPageCount(payload: SunatPagePayload): boolean {
  if (payload.records > 0)
    return payload.total === Math.ceil(payload.records / 25);
  return (
    [0, 1].includes(payload.total) &&
    [0, 1].includes(payload.startPage) &&
    payload.endPage === 0 &&
    payload.rows.length === 0
  );
}

export function parseNativePage(
  input: unknown,
  connection: string,
  mailbox: MailboxKind,
): MailboxPage {
  const parsed = sunatPagePayloadSchema.safeParse(input);
  if (!parsed.success) throw new MailboxError("UNEXPECTED_RESPONSE");
  const payload = parsed.data;
  if (
    !consistentPageCount(payload) ||
    payload.rows.some((row) => row.indTipmsj !== mailboxType(mailbox))
  )
    throw new MailboxError("PAGE_INCONSISTENT");
  return {
    connection_key: connection,
    mailbox,
    page:
      payload.page ??
      (payload.records === 0
        ? 1
        : Math.floor((payload.startPage - 1) / 25) + 1),
    page_size: 25,
    start: payload.records === 0 ? 1 : payload.startPage,
    end: payload.endPage,
    total: payload.records,
    order: "unverified",
    items: payload.rows.map((row) => ({
      id: row.codMensaje,
      published_on: sourceDate(row.fecPublica),
      read: row.indEstado !== 0,
      has_attachments: row.cantidadArchAdj > 0,
    })),
  };
}

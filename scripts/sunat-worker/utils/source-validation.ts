import { createHash } from "node:crypto";

import { SUNAT_FILE_LIMIT } from "../../../src/domain/sunat/constants/sunat";
import { MailboxError } from "../../sunat-pilot/worker/services/mailbox-error";
import type {
  MailboxKind,
  MailboxPage,
} from "../../sunat-pilot/worker/types/mailbox.types";
import type {
  ObservedPage,
  SourceAttachment,
  SourceFile,
  SourceRecord,
} from "../types/source.types";

export function isOfficialSunatUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (
      url.protocol === "https:" &&
      (url.hostname === "sunat.gob.pe" ||
        url.hostname.endsWith(".sunat.gob.pe"))
    );
  } catch {
    return false;
  }
}

export function sourceDate(text: string): string {
  const match = text.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  if (!match) throw new MailboxError("UNEXPECTED_RESPONSE");
  const value = `${match[3]}-${match[2]}-${match[1]}`;
  if (new Date(value + "T12:00:00Z").toISOString().slice(0, 10) !== value)
    throw new MailboxError("UNEXPECTED_RESPONSE");
  return value;
}

export function parseObservedPage(
  observed: ObservedPage,
  connection: string,
  mailbox: MailboxKind,
  page: number,
): MailboxPage {
  const counter = observed.text.match(/(\d+)\s*[-–]\s*(\d+)\s+de\s+(\d+)/i);
  if (!counter) throw new MailboxError("UNEXPECTED_RESPONSE");
  return {
    connection_key: connection,
    mailbox,
    page,
    page_size: 25,
    start: Number(counter[1]),
    end: Number(counter[2]),
    total: Number(counter[3]),
    order: "unverified",
    items: observed.rows.map((row) => ({
      id: row.id,
      published_on: sourceDate(row.text),
      read: !row.unread,
      has_attachments: true,
    })),
  };
}

export function richRecords(
  observed: ObservedPage,
  parsed: MailboxPage,
): SourceRecord[] {
  return parsed.items.map((item, index) => ({
    ...item,
    subject:
      observed.rows[index].subject.trim().slice(0, 500) || "Registro SUNAT",
  }));
}

export function attachmentFromLink(
  href: string,
  text: string,
  base: string,
  ruc: string,
): SourceAttachment {
  const url = new URL(href, base);
  if (
    !isOfficialSunatUrl(url.href) ||
    !/^\/ol-ti-itvisornoti\/visor\/bajarArchivo\//.test(url.pathname) ||
    !url.pathname.endsWith("/" + ruc) ||
    url.search ||
    url.hash
  )
    throw new MailboxError("UNEXPECTED_RESPONSE");
  return {
    source_key: createHash("sha256").update(url.pathname).digest("hex"),
    locator: url.pathname,
    filename: (text.trim() || "archivo-sunat.pdf")
      .replace(/[\\/\x00-\x1f]/g, "_")
      .slice(0, 240),
  };
}

export function validatedSourceFile(bytes: Buffer): SourceFile {
  if (bytes.length > SUNAT_FILE_LIMIT) throw new MailboxError("FILE_TOO_LARGE");
  if (!bytes.length) throw new MailboxError("UNEXPECTED_RESPONSE");
  const prefix = bytes.subarray(0, 16).toString("latin1");
  const mime = prefix.startsWith("%PDF-")
    ? "application/pdf"
    : bytes[0] === 0x50 && bytes[1] === 0x4b
      ? "application/zip"
      : prefix.startsWith("\x89PNG")
        ? "image/png"
        : bytes[0] === 0xff && bytes[1] === 0xd8
          ? "image/jpeg"
          : null;
  if (!mime) throw new MailboxError("UNEXPECTED_RESPONSE");
  return { bytes, mime };
}

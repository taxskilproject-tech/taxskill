import type { MailboxFailureCode } from "../types/mailbox.types";

export class MailboxError extends Error {
  constructor(readonly code: MailboxFailureCode) {
    super(code);
    this.name = "MailboxError";
  }
}

export function mailboxFailureCode(error: unknown): MailboxFailureCode {
  return error instanceof MailboxError ? error.code : "UNEXPECTED_RESPONSE";
}

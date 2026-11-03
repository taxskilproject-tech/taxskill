import type {
  MailboxFailureCode,
  MailboxPage,
  MailboxPageFailure,
} from "../types/mailbox.types";

export class MailboxError extends Error {
  constructor(
    readonly code: MailboxFailureCode,
    readonly validation?: MailboxPageFailure,
    readonly phase?: string,
    readonly partialPage?: MailboxPage,
  ) {
    super(code);
    this.name = "MailboxError";
  }
}

export function mailboxFailureCode(error: unknown): MailboxFailureCode {
  return error instanceof MailboxError ? error.code : "UNEXPECTED_RESPONSE";
}

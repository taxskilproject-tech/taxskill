import { MailboxError } from "../../sunat-pilot/worker/services/mailbox-error";

export function requireMailboxIdentity(
  actual: string | null,
  expected: string,
): void {
  if (!/^\d{11}$/.test(expected) || actual !== expected)
    throw new MailboxError("UNEXPECTED_RESPONSE");
}

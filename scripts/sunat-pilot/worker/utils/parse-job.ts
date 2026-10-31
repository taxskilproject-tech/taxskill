import { mailboxJobSchema } from "../contracts/mailbox.schema";
import { MailboxError } from "../services/mailbox-error";
import type { MailboxJob } from "../types/mailbox.types";

export function parseMailboxJob(input: unknown, now: number): MailboxJob {
  const parsed = mailboxJobSchema.safeParse(input);
  if (!parsed.success) {
    const consentInvalid = parsed.error.issues.some(
      (issue) => issue.path[0] === "read_effect_consent",
    );
    throw new MailboxError(
      consentInvalid ? "CONSENT_REQUIRED" : "JOB_INPUT_INVALID",
    );
  }
  if (Date.parse(parsed.data.read_effect_consent.accepted_at) > now)
    throw new MailboxError("CONSENT_REQUIRED");
  return parsed.data;
}

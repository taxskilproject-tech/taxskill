import { MailboxError } from "../../sunat-pilot/worker/services/mailbox-error";
import type { PilotFailureCode } from "../types/pilot.types";

export function pilotFailureCode(error: unknown): PilotFailureCode {
  if (error instanceof MailboxError) return error.code;
  if (error instanceof Error && error.message === "PILOT_REPORT_STORE_FAILED")
    return "PILOT_REPORT_STORE_FAILED";
  if (error instanceof Error && error.message === "PILOT_CLEANUP_FAILED")
    return "PILOT_CLEANUP_FAILED";
  return "SOURCE_UNAVAILABLE";
}

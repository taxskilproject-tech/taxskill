import { setTimeout as delay } from "node:timers/promises";

import { MailboxError } from "../../sunat-pilot/worker/services/mailbox-error";
import {
  SUNAT_LOGIN_MAX_ATTEMPTS,
  SUNAT_LOGIN_RETRY_DELAY_MS,
} from "../constants/source";
import type { ConnectionTask } from "../types/source.types";
import {
  connectionAbortError,
  withConnectionSignal,
} from "../utils/connection-signal";

function requireRetryableConnection(
  error: unknown,
  attempt: number,
  signal: AbortSignal,
): void {
  if (signal.aborted) throw connectionAbortError(signal);
  if (!(error instanceof MailboxError) || error.code !== "SOURCE_UNAVAILABLE")
    throw error;
  if (attempt === SUNAT_LOGIN_MAX_ATTEMPTS) throw error;
}

export async function retrySunatConnection<T>(
  connect: ConnectionTask<T>,
  signal: AbortSignal,
): Promise<T> {
  for (let attempt = 1; attempt <= SUNAT_LOGIN_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await withConnectionSignal(connect, signal);
    } catch (error) {
      requireRetryableConnection(error, attempt, signal);
      console.info(JSON.stringify({ event: "source_login_retry", attempt }));
      await withConnectionSignal(
        () => delay(SUNAT_LOGIN_RETRY_DELAY_MS, undefined, { signal }),
        signal,
      );
    }
  }
  throw new MailboxError("SOURCE_UNAVAILABLE");
}

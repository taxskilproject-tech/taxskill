import { MailboxError } from "../../sunat-pilot/worker/services/mailbox-error";
import type { ConnectionTask } from "../types/source.types";

export function connectionAbortError(signal: AbortSignal): MailboxError {
  return signal.reason instanceof MailboxError
    ? signal.reason
    : new MailboxError("BUDGET_EXHAUSTED");
}

export async function withConnectionSignal<T>(
  task: ConnectionTask<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) throw connectionAbortError(signal);
  const interrupted = Promise.withResolvers<never>();
  const abort = () => interrupted.reject(connectionAbortError(signal));
  signal.addEventListener("abort", abort, { once: true });
  try {
    return await Promise.race([task(), interrupted.promise]);
  } finally {
    signal.removeEventListener("abort", abort);
  }
}

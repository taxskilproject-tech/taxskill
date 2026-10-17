import { EXPORT_AUDIT_TIMEOUT_MS } from "@/features/reporting/constants/export-transport";
import type { TimedExportRequest } from "@/features/reporting/types/export.types";

function abortRejection(signal: AbortSignal) {
  return new Promise<never>((_, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason), {
      once: true,
    });
  });
}

export async function timedExportRequest<T>({
  request,
  signal,
  timeoutMs = EXPORT_AUDIT_TIMEOUT_MS,
}: TimedExportRequest<T>): Promise<T> {
  signal?.throwIfAborted();
  const controller = new AbortController();
  const interrupted = abortRejection(controller.signal);
  const cancel = () => controller.abort(signal?.reason);
  const timer = setTimeout(
    () =>
      controller.abort(
        new Error(
          "Se agotó el tiempo de respuesta del registro de exportación.",
        ),
      ),
    timeoutMs,
  );
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    return await Promise.race([request(controller.signal), interrupted]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
    // Release abort listeners even when a transport ignores cancellation.
    controller.abort();
  }
}

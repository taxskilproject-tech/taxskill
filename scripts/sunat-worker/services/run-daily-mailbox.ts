import { runMonthlyMailboxQuery } from "../../sunat-pilot/worker/services/run-monthly-query";
import type {
  MailboxJob,
  MailboxRunDependencies,
  MailboxRunResult,
} from "../../sunat-pilot/worker/types/mailbox.types";

// Un cambio de ancla reinicia el barrido, conservando el presupuesto del intento anterior.
export async function runDailyMailbox(
  job: MailboxJob,
  dependencies: MailboxRunDependencies,
): Promise<MailboxRunResult> {
  const previous = await runMonthlyMailboxQuery(job, dependencies);
  if (previous.reason !== "SOURCE_CHANGED") return previous;
  const pages = job.limits.max_pages - previous.metrics.pages_read;
  const requests = job.limits.max_requests - previous.metrics.request_count;
  const duration = job.limits.max_duration_ms - previous.metrics.duration_ms;
  if (pages < 1 || requests < 1 || duration < 1)
    return { ...previous, status: "partial", reason: "BUDGET_EXHAUSTED" };
  const current = await runMonthlyMailboxQuery(
    {
      ...job,
      mode: "refresh",
      limits: {
        ...job.limits,
        max_pages: pages,
        max_requests: requests,
        max_duration_ms: duration,
        request_timeout_ms: Math.min(job.limits.request_timeout_ms, duration),
      },
    },
    dependencies,
  );
  return {
    ...current,
    metrics: {
      duration_ms: previous.metrics.duration_ms + current.metrics.duration_ms,
      cpu_time_ms: previous.metrics.cpu_time_ms + current.metrics.cpu_time_ms,
      peak_memory_mb: Math.max(
        previous.metrics.peak_memory_mb,
        current.metrics.peak_memory_mb,
      ),
      request_count:
        previous.metrics.request_count + current.metrics.request_count,
      pages_read: previous.metrics.pages_read + current.metrics.pages_read,
      pages_accepted:
        previous.metrics.pages_accepted + current.metrics.pages_accepted,
      session_renewals:
        previous.metrics.session_renewals + current.metrics.session_renewals,
    },
  };
}

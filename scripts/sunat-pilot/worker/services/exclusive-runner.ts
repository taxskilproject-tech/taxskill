import type {
  ActiveMailboxJob,
  MailboxJob,
  MailboxRunDependencies,
  MailboxRunResult,
} from "../types/mailbox.types";
import { parseMailboxJob } from "../utils/parse-job";
import { MailboxError } from "./mailbox-error";
import { runMonthlyMailboxQuery } from "./run-monthly-query";

// This prototype owns one sequential worker. Production needs a durable DB lease.
export function createExclusiveMailboxRunner(
  dependencies: MailboxRunDependencies,
) {
  const activeConnections = new Map<string, ActiveMailboxJob>();
  let tail = Promise.resolve();
  return (input: unknown): Promise<MailboxRunResult> => {
    let job: MailboxJob;
    try {
      job = parseMailboxJob(input, Date.now());
    } catch (error) {
      return Promise.reject(error);
    }
    const identity = JSON.stringify(job);
    const existing = activeConnections.get(job.connection_key);
    if (existing?.identity === identity) return existing.promise;
    if (existing)
      return Promise.reject(new MailboxError("JOB_ALREADY_RUNNING"));
    const run = tail.then(() => runMonthlyMailboxQuery(job, dependencies));
    activeConnections.set(job.connection_key, {
      identity,
      promise: run,
    });
    const clean = () => {
      activeConnections.delete(job.connection_key);
    };
    // The caller receives the original rejection; queue cleanup handles both outcomes.
    tail = run.then(clean, clean);
    return run;
  };
}

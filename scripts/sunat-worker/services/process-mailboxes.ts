import { runMonthlyMailboxQuery } from "../../sunat-pilot/worker/services/run-monthly-query";
import type { MailboxKind } from "../../sunat-pilot/worker/types/mailbox.types";
import { workerCheckpointStore } from "../repositories/worker-repository";
import type {
  ClaimedSunatJob,
  WorkerCompletion,
  WorkerDependencies,
} from "../types/worker.types";
import { workerMailboxJob } from "../utils/mailbox-job";
import { runDailyMailbox } from "./run-daily-mailbox";

export async function processMailboxes(
  claim: ClaimedSunatJob,
  dependencies: WorkerDependencies,
): Promise<WorkerCompletion> {
  const results: WorkerCompletion["results"] = [];
  let error: string | null = null;
  const metrics: Record<string, number> = { pages: 0, session_renewals: 0 };
  const mailboxes: MailboxKind[] = ["notifications", "messages"];
  const checkpoints = workerCheckpointStore(
    dependencies.client,
    claim,
    dependencies.source,
  );
  for (const mailbox of mailboxes) {
    const job = workerMailboxJob(claim, mailbox);
    const execute =
      claim.job.kind === "daily" ? runDailyMailbox : runMonthlyMailboxQuery;
    const result = await execute(job, {
      transport: dependencies.source,
      checkpoints,
    });
    results.push({
      mailbox,
      state: result.status === "complete" ? "complete" : "partial",
    });
    error ??= result.reason;
    metrics.pages += result.metrics.pages_accepted;
    metrics.session_renewals += result.metrics.session_renewals;
    if (result.status === "requires_attention") break;
  }
  const complete =
    results.length === 2 &&
    results.every((result) => result.state === "complete");
  return { state: complete ? "complete" : "partial", error, results, metrics };
}

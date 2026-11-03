import type { SunatKeyring } from "../../../src/domain/sunat/types/credentials.types";
import { decryptSunatCredentials } from "../../../src/features/sunat-mailbox/services/credentials-crypto.server";
import { asJson } from "../../../src/lib/supabase/utils/as-json";
import { MailboxError } from "../../sunat-pilot/worker/services/mailbox-error";
import type { MailboxPageDiagnostic } from "../../sunat-pilot/worker/types/mailbox.types";
import { WORKER_RPC_TIMEOUT_MS } from "../constants/runtime";
import { failSunatJob } from "../repositories/worker-status";
import type {
  ClaimedSunatJob,
  WorkerDependencies,
} from "../types/worker.types";
import { withinDeadline } from "../utils/within-deadline";
import { processSunatJob } from "./process-job";
import { createWorkerLifetime } from "./worker-lifetime";

const MAX_PAGE_DIAGNOSTICS = 20;

export async function runClaimedSunatJob(
  claim: ClaimedSunatJob,
  dependencies: WorkerDependencies,
  keys: SunatKeyring,
) {
  const started = performance.now();
  const cpu = process.cpuUsage();
  const args = { p_job_id: claim.job.id, p_lease_token: claim.job.lease_token };
  const lifetime = createWorkerLifetime(claim, dependencies);
  const pageFailures: MailboxPageDiagnostic[] = [];
  let phase = "credentials";
  try {
    const credentials = decryptSunatCredentials(
      claim.encrypted,
      {
        organization_id: claim.job.organization_id,
        company_id: claim.job.company_id,
        connection_id: claim.job.connection_id,
        credential_version: claim.job.credential_version,
      },
      keys,
    );
    if (credentials.ruc !== claim.company.ruc.trim())
      throw new Error("SOURCE_IDENTITY_MISMATCH");
    phase = "connection";
    await lifetime.wait(
      dependencies.source.connect(credentials, lifetime.signal),
    );
    lifetime.check();
    phase = "read";
    const completion = await lifetime.wait(
      processSunatJob(claim, {
        ...dependencies,
        onPageFailure: (failure) => {
          if (pageFailures.length < MAX_PAGE_DIAGNOSTICS)
            pageFailures.push(failure);
        },
      }),
    );
    lifetime.check();
    const usage = process.cpuUsage(cpu);
    phase = "persist";
    const response = await lifetime.wait(
      withinDeadline(
        dependencies.client
          .rpc("h10_worker_finish", {
            ...args,
            p_state: completion.state,
            p_error_code: completion.error ?? "",
            p_results: asJson(completion.results),
            p_metrics: {
              ...completion.metrics,
              duration_ms: Math.ceil(performance.now() - started),
              cpu_time_ms: (usage.user + usage.system) / 1000,
              peak_memory_mb: Math.ceil(process.resourceUsage().maxRSS / 1024),
              request_count: dependencies.source.requestCount(),
              page_failures: asJson(pageFailures),
            },
          })
          .abortSignal(lifetime.signal),
        WORKER_RPC_TIMEOUT_MS,
        "WORKER_STATUS_UNAVAILABLE",
      ),
    );
    if (response.error || !response.data) throw new Error("ACCESS_REVOKED");
    return completion.state;
  } catch (error) {
    const code = lifetime.errorCode(error);
    return await failSunatJob(claim, dependencies.client, code, {
      failure_phase:
        error instanceof MailboxError ? (error.phase ?? phase) : phase,
      page_failures: asJson(pageFailures),
    });
  } finally {
    await lifetime.dispose();
  }
}

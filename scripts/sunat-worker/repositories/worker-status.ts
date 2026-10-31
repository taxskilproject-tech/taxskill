import { sunatJobSchema } from "../../../src/domain/sunat/contracts/sunat.schema";
import { WORKER_RPC_TIMEOUT_MS } from "../constants/runtime";
import { workerTerminalStateSchema } from "../contracts/worker.schema";
import type { WorkerStatusWriteResult } from "../types/lifetime.types";
import type {
  ClaimedSunatJob,
  WorkerDependencies,
  WorkerTerminalState,
} from "../types/worker.types";
import { withinDeadline } from "../utils/within-deadline";

const retainedJobStateSchema = sunatJobSchema.pick({ state: true }).extend({
  state: workerTerminalStateSchema,
});

async function acknowledged(write: PromiseLike<WorkerStatusWriteResult>) {
  try {
    const response = await withinDeadline(
      write,
      WORKER_RPC_TIMEOUT_MS,
      "WORKER_STATUS_UNAVAILABLE",
    );
    return !response.error && response.data === true;
  } catch {
    // Un fallo de transporte exige conciliación; no confirma la escritura.
    return false;
  }
}

async function terminalState(
  claim: ClaimedSunatJob,
  client: WorkerDependencies["client"],
): Promise<WorkerTerminalState | null> {
  const response = await withinDeadline(
    client
      .from("sunat_jobs")
      .select("state")
      .eq("id", claim.job.id)
      .eq("organization_id", claim.job.organization_id)
      .eq("company_id", claim.job.company_id)
      .maybeSingle(),
    WORKER_RPC_TIMEOUT_MS,
    "WORKER_STATUS_UNAVAILABLE",
  );
  if (response.error) return null;
  const parsed = retainedJobStateSchema.safeParse(response.data);
  return parsed.success ? parsed.data.state : null;
}

export async function failSunatJob(
  claim: ClaimedSunatJob,
  client: WorkerDependencies["client"],
  code: string,
): Promise<WorkerTerminalState> {
  if (!/^[A-Z_]{3,60}$/.test(code))
    throw new Error("WORKER_ERROR_CODE_INVALID");
  const args = { p_job_id: claim.job.id, p_lease_token: claim.job.lease_token };
  const failed = await acknowledged(
    client.rpc("h10_worker_finish", {
      ...args,
      p_state: "failed",
      p_error_code: code,
      p_results: [],
      p_metrics: {},
    }),
  );
  if (failed) return "failed";
  const abandoned = await acknowledged(
    client.rpc("h10_worker_abandon", {
      ...args,
      p_error_code: code,
    }),
  );
  if (abandoned) return "failed";
  // Una revocación puede haber cancelado el trabajo antes de estos RPC.
  const retained = await terminalState(claim, client);
  if (retained) return retained;
  throw new Error("WORKER_STATUS_UNAVAILABLE");
}

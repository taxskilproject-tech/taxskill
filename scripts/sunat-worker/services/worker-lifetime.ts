import { MailboxError } from "../../sunat-pilot/worker/services/mailbox-error";
import {
  WORKER_CLEANUP_TIMEOUT_MS,
  WORKER_HEARTBEAT_INTERVAL_MS,
  WORKER_JOB_TIMEOUT_MS,
  WORKER_RPC_TIMEOUT_MS,
} from "../constants/runtime";
import type { WorkerLifetime, WorkerStopReason } from "../types/lifetime.types";
import type {
  ClaimedSunatJob,
  WorkerDependencies,
} from "../types/worker.types";
import { withinDeadline } from "../utils/within-deadline";

export function createWorkerLifetime(
  claim: ClaimedSunatJob,
  dependencies: WorkerDependencies,
): WorkerLifetime {
  const args = { p_job_id: claim.job.id, p_lease_token: claim.job.lease_token };
  const controller = new AbortController();
  const interrupted = Promise.withResolvers<void>();
  let reason: WorkerStopReason | null = null;
  let disposed = false;
  let renewal: Promise<void> | null = null;
  let closure: Promise<boolean> | null = null;
  function closeSource(): Promise<boolean> {
    closure ??= withinDeadline(
      Promise.resolve().then(() => dependencies.source.close()),
      WORKER_CLEANUP_TIMEOUT_MS,
      "WORKER_CLEANUP_FAILED",
    ).then(
      () => true,
      () => false,
    );
    return closure;
  }
  function interrupt(code: WorkerStopReason): void {
    if (disposed) return;
    if (reason !== "ACCESS_REVOKED") reason = code;
    controller.abort(reason);
    interrupted.resolve();
    void closeSource();
  }
  function check(): void {
    if (reason) throw new Error(reason);
  }
  const heartbeat = setInterval(() => {
    if (renewal || disposed) return;
    renewal = withinDeadline(
      dependencies.client
        .rpc("h10_worker_heartbeat", args)
        .abortSignal(AbortSignal.timeout(WORKER_RPC_TIMEOUT_MS)),
      WORKER_RPC_TIMEOUT_MS,
      "WORKER_HEARTBEAT_UNAVAILABLE",
    )
      .then((response) => {
        if (response.error || response.data !== true)
          interrupt("ACCESS_REVOKED");
      })
      .catch(() => interrupt("ACCESS_REVOKED"))
      .finally(() => {
        renewal = null;
      });
  }, WORKER_HEARTBEAT_INTERVAL_MS);
  const deadline = setTimeout(
    () => interrupt("WORKER_TIMEOUT"),
    WORKER_JOB_TIMEOUT_MS,
  );
  return {
    signal: controller.signal,
    check,
    wait: async <T>(work: PromiseLike<T>) => {
      const value = await Promise.race([
        Promise.resolve(work),
        interrupted.promise.then(() => {
          check();
          throw new Error("WORKER_TIMEOUT");
        }),
      ]);
      check();
      return value;
    },
    errorCode: (error) => {
      if (reason) return reason;
      if (error instanceof Error && error.message === "ACCESS_REVOKED")
        return "ACCESS_REVOKED";
      return error instanceof MailboxError ? error.code : "UNEXPECTED_RESPONSE";
    },
    dispose: async () => {
      disposed = true;
      clearInterval(heartbeat);
      clearTimeout(deadline);
      await renewal;
      if (!(await closeSource())) throw new Error("WORKER_CLEANUP_FAILED");
    },
  };
}

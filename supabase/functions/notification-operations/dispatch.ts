import { z } from "zod";
import { dispatchAttemptSchema, dispatchClaimSchema } from "../../../src/domain/integrations/contracts/whatsapp.schema.ts";
import type { DispatchClient, DispatchEnvironment } from "./types/notification-edge.types.ts";

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 5000;
const RETRY_DELAYS_MS = [1000, 3000];
export async function dispatchBatch(admin: DispatchClient, environment: DispatchEnvironment) {
  const claimed = await admin.rpc("h06_claim_batch");
  if (claimed.error) throw new Error("DEPENDENCY_UNAVAILABLE");
  const reservation = dispatchClaimSchema.parse(claimed.data);
  if (reservation.status === "idle") return { status: "idle" };
  const serialized = JSON.stringify(reservation.batch);
  for (let index = 0; index < MAX_ATTEMPTS; index++) {
    const began = await admin.rpc("h06_begin_dispatch", { p_batch_id: reservation.batch.batch_id, p_lease_id: reservation.lease_id });
    if (began.error) throw new Error("DEPENDENCY_UNAVAILABLE");
    const attempt = dispatchAttemptSchema.parse(began.data);
    const started = Date.now();
    let httpStatus: number | null = null;
    let outcome = "responded";
    let accepted = false;
    try {
      const response = await fetch(environment.webhookUrl, { method: "POST", redirect: "error", headers: { Authorization: `Bearer ${environment.webhookToken}`, "Content-Type": "application/json" }, body: serialized, signal: AbortSignal.timeout(TIMEOUT_MS) });
      httpStatus = response.status;
      if (response.ok) accepted = z.object({ accepted: z.literal(true) }).safeParse(await response.json()).success;
      else await response.body?.cancel();
    } catch (cause) { outcome = cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError") ? "timeout" : "connection_error"; }
    const finished = await admin.rpc("h06_finish_dispatch", { p_attempt_id: attempt.attempt_id, p_http_status: httpStatus ?? undefined, p_duration_ms: Date.now() - started, p_outcome: outcome, p_accepted: accepted });
    if (finished.error) throw new Error("DEPENDENCY_UNAVAILABLE");
    const retryable = httpStatus === null || httpStatus === 429 || httpStatus >= 500;
    if (accepted || !retryable || attempt.attempt_number >= MAX_ATTEMPTS) return { status: accepted ? "accepted" : "pending_reconciliation", attempts: attempt.attempt_number };
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt.attempt_number - 1]));
  }
  return { status: "pending_reconciliation" };
}

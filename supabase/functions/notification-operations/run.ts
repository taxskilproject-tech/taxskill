import { dispatchBatch } from "./dispatch.ts";
import type { DispatchClient, DispatchEnvironment } from "./types/notification-edge.types.ts";

export async function runNotificationCycle(admin: DispatchClient, environment: DispatchEnvironment) {
  const deadlines = await admin.rpc("h06_run_deadlines", {});
  const prepared = await admin.rpc("h06_prepare_digests", { p_base_url: environment.appBaseUrl });
  if (prepared.error) throw new Error("DEPENDENCY_UNAVAILABLE");
  // A failed notice page must not prevent dispatching other eligible durable digests.
  const dispatched = await dispatchBatch(admin, environment);
  const failed = Boolean(deadlines.error) || (deadlines.data && typeof deadlines.data === "object" && "status" in deadlines.data && deadlines.data.status === "failed");
  return { status: failed ? "degraded" : "completed", dispatch: dispatched };
}

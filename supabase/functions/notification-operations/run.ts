import { dispatchBatch } from "./dispatch.ts";
import type { DispatchClient, DispatchEnvironment, DispatchPageResult } from "./types/notification-edge.types.ts";

function pageFailed(page: DispatchPageResult) {
  return Boolean(page.error) || Boolean(page.data && typeof page.data === "object" && "status" in page.data && page.data.status === "failed");
}

export async function runNotificationCycle(admin: DispatchClient, environment: DispatchEnvironment) {
  const deadlines = await admin.rpc("h06_run_deadlines", {});
  const prepared = await admin.rpc("h06_prepare_digests", { p_base_url: environment.appBaseUrl });
  // A failed preparation page must not block other eligible, durable digests either.
  const dispatched = await dispatchBatch(admin, environment);
  const failed = pageFailed(deadlines) || pageFailed(prepared);
  return { status: failed ? "degraded" : "completed", dispatch: dispatched };
}

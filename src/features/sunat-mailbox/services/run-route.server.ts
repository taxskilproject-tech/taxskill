import "server-only";

import { sunatDispatchRequestSchema } from "@/features/sunat-mailbox/contracts/dispatch.schema";
import { usesLocalSunatWorker } from "@/features/sunat-mailbox/services/dispatch-environment.server";
import {
  authorizeSunatRoute,
  readSunatRequest,
  sunatRouteError,
  sunatRouteSuccess,
} from "@/features/sunat-mailbox/services/route-security.server";
import { scheduleSunatDispatch } from "@/features/sunat-mailbox/services/schedule-dispatch.server";

export async function runSunatRoute(request: Request): Promise<Response> {
  const startedAt = performance.now();
  try {
    const input = sunatDispatchRequestSchema.safeParse(
      await readSunatRequest(request),
    );
    if (!input.success) throw { code: "VALIDATION_ERROR" };
    const { admin, session } = await authorizeSunatRoute(
      input.data.organization_id,
      false,
    );
    const allowed = await session.rpc("h10_dispatch_authorize", {
      p_organization_id: input.data.organization_id,
      p_job_id: input.data.job_id,
    });
    if (allowed.error || allowed.data !== true) throw { code: "FORBIDDEN" };
    if (!usesLocalSunatWorker())
      await scheduleSunatDispatch(admin, false, startedAt);
    return sunatRouteSuccess({ accepted: true });
  } catch (error) {
    return sunatRouteError(error);
  }
}

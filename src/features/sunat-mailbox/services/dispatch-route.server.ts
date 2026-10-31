import "server-only";

import { SUNAT_DISPATCH_RPC_TIMEOUT_MS } from "@/features/sunat-mailbox/constants/dispatch";
import { sunatDispatchEnvelopeSchema } from "@/features/sunat-mailbox/contracts/dispatch.schema";
import {
  readSunatJsonBody,
  sunatRouteError,
  sunatRouteSuccess,
} from "@/features/sunat-mailbox/services/route-security.server";
import { scheduleSunatDispatch } from "@/features/sunat-mailbox/services/schedule-dispatch.server";
import { hasSunatDispatchAuthorization } from "@/features/sunat-mailbox/utils/dispatch-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin.server";

export async function dispatchSunatRoute(request: Request): Promise<Response> {
  const startedAt = performance.now();
  try {
    const parsed = sunatDispatchEnvelopeSchema.safeParse(
      await readSunatJsonBody(request),
    );
    if (!parsed.success) throw { code: "VALIDATION_ERROR" };
    const envelope = parsed.data;
    if (
      !hasSunatDispatchAuthorization(
        request.headers.get("x-taxskill-signature"),
        envelope,
        process.env.SUNAT_DISPATCH_SECRET,
      )
    )
      throw { code: "UNAUTHENTICATED" };
    const admin = createSupabaseAdminClient();
    if (!admin.ok) throw admin.error;
    const consumed = await admin.data
      .rpc("h10_dispatch_consume_nonce", {
        p_nonce: envelope.nonce,
        p_issued_at: envelope.issued_at,
      })
      .abortSignal(AbortSignal.timeout(SUNAT_DISPATCH_RPC_TIMEOUT_MS));
    if (consumed.error) throw consumed.error;
    if (consumed.data !== true) return sunatRouteSuccess({ accepted: true });
    await scheduleSunatDispatch(
      admin.data,
      process.env.SUNAT_DAILY_ENABLED === "true",
      startedAt,
    );
    return sunatRouteSuccess({ accepted: true });
  } catch (error) {
    return sunatRouteError(error);
  }
}

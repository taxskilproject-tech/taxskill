import "server-only";
import { after } from "next/server";

import {
  SUNAT_DISPATCH_PREPARATION_TIMEOUT_MS,
  SUNAT_DISPATCH_RPC_TIMEOUT_MS,
} from "@/features/sunat-mailbox/constants/dispatch";
import { sunatDispatchTicketSchema } from "@/features/sunat-mailbox/contracts/dispatch.schema";
import { getSunatDispatcherEnvironment } from "@/features/sunat-mailbox/services/dispatch-environment.server";
import { executeSunatSandbox } from "@/features/sunat-mailbox/services/dispatch-sandbox.server";
import type { AppSupabaseClient } from "@/lib/supabase/types/client.types";

export async function scheduleSunatDispatch(
  client: AppSupabaseClient,
  runDaily: boolean,
  startedAt = performance.now(),
) {
  const config = getSunatDispatcherEnvironment();
  if (performance.now() - startedAt > SUNAT_DISPATCH_PREPARATION_TIMEOUT_MS)
    throw { code: "DEPENDENCY_UNAVAILABLE" };
  const response = await client
    .rpc("h10_dispatch_claim", {
      p_run_daily: runDaily,
    })
    .abortSignal(AbortSignal.timeout(SUNAT_DISPATCH_RPC_TIMEOUT_MS));
  if (response.error) throw { code: "DEPENDENCY_UNAVAILABLE" };
  if (response.data === null) return;
  const ticket = sunatDispatchTicketSchema.safeParse(response.data);
  if (!ticket.success) throw { code: "DEPENDENCY_UNAVAILABLE" };
  after(() => executeSunatSandbox({ client, config, ticket: ticket.data }));
}

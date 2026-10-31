import type { z } from "zod";

import type {
  sunatDispatchEnvelopeSchema,
  sunatDispatcherEnvironmentSchema,
  sunatDispatchTicketSchema,
} from "@/features/sunat-mailbox/contracts/dispatch.schema";
import type { AppSupabaseClient } from "@/lib/supabase/types/client.types";

export type SunatDispatchTicket = z.infer<typeof sunatDispatchTicketSchema>;
export type SunatDispatchEnvelope = z.infer<typeof sunatDispatchEnvelopeSchema>;
export type SunatDispatcherEnvironment = z.infer<
  typeof sunatDispatcherEnvironmentSchema
>;
export interface SunatDispatchExecution {
  client: AppSupabaseClient;
  ticket: SunatDispatchTicket;
  config: SunatDispatcherEnvironment;
}
export type SunatDispatchPhase = "configuration" | "create" | "write" | "run";

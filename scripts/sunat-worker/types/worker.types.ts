import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

import type { Database } from "../../../src/lib/supabase/types/database.types";
import type {
  claimedJobSchema,
  workerTerminalStateSchema,
} from "../contracts/worker.schema";
import type { SunatSource } from "./source.types";

export type ClaimedSunatJob = z.infer<typeof claimedJobSchema>;
export type WorkerTerminalState = z.infer<typeof workerTerminalStateSchema>;
export interface WorkerDependencies {
  client: SupabaseClient<Database>;
  source: SunatSource;
}
export interface WorkerCheckpointContext extends WorkerDependencies {
  claim: ClaimedSunatJob;
  checkpoints: ClaimedSunatJob["job"]["checkpoint"];
  previous: Map<string, number>;
  observed: Map<string, Set<string>>;
}
export interface MailboxCompletion {
  mailbox: "notifications" | "messages";
  state: "complete" | "partial" | "failed";
}
export interface WorkerCompletion {
  state: "complete" | "partial" | "failed";
  error: string | null;
  results: MailboxCompletion[];
  metrics: Record<string, number>;
}

import type { z } from "zod";

import type { AdminEnvelope } from "@/domain/access/types/access.types";
import type { adminEntrySchema } from "@/features/users/contracts/admin-entry.schema";
import type { AppSupabaseClient } from "@/lib/supabase/types/client.types";

export type AdminEntry = z.infer<typeof adminEntrySchema>;
export interface AdminExecution {
  client: AppSupabaseClient;
  envelope: AdminEnvelope;
  actorId: string;
  fingerprint: string;
}
export interface AdminRouteInput {
  request: Request;
  operation: AdminEnvelope["operation"];
  userId?: string;
}

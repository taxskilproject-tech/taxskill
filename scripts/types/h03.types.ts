import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../src/lib/supabase/types/database.types";
export type H03Client = SupabaseClient<Database>;
export interface LiveUpload {
  client: H03Client;
  admin: H03Client;
  organizationId: string;
  slotId: string;
  cycleId: string;
  revision: number;
  name: string;
  bytes: Uint8Array;
}

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../src/lib/supabase/types/database.types";

export interface DemoIdentity {
  email: string;
  password: string;
  requestId: string;
  fullName: string;
  memberType: "internal" | "client";
  roleCode: string;
}
export interface HttpSession {
  client: SupabaseClient<Database>;
  cookie: () => string;
}

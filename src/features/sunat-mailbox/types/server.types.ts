import type { SessionContext } from "@/features/auth/types/auth.types";
import type { AppSupabaseClient } from "@/lib/supabase/types/client.types";

export interface SunatRouteAuthorization {
  context: SessionContext;
  session: AppSupabaseClient;
  admin: AppSupabaseClient;
}

import "server-only";
import { createClient } from "@supabase/supabase-js";

import { getAdminEnvironment } from "@/config/env/server-env.server";
import type { OperationResult } from "@/domain/common/types/operation.types";
import { success } from "@/domain/common/utils/operation-result";
import type { AppSupabaseClient } from "@/lib/supabase/types/client.types";
import type { Database } from "@/lib/supabase/types/database.types";

export function createSupabaseAdminClient(): OperationResult<AppSupabaseClient> {
  const environment = getAdminEnvironment();
  if (!environment.ok) return environment;

  return success(
    createClient<Database>(
      environment.data.supabaseUrl,
      environment.data.secretKey,
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    ),
  );
}

import "client-only";
import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnvironment } from "@/config/env/public-env";
import type { OperationResult } from "@/domain/common/types/operation.types";
import { success } from "@/domain/common/utils/operation-result";
import type { AppSupabaseClient } from "@/lib/supabase/types/client.types";
import type { Database } from "@/lib/supabase/types/database.types";

export function createSupabaseBrowserClient(): OperationResult<AppSupabaseClient> {
  const environment = getPublicEnvironment();
  if (!environment.ok) return environment;

  return success(
    createBrowserClient<Database>(
      environment.data.supabaseUrl,
      environment.data.publishableKey,
    ),
  );
}

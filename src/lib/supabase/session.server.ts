import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicEnvironment } from "@/config/env/public-env";
import { success } from "@/domain/common/utils/operation-result";
import type { Database } from "@/lib/supabase/types/database.types";

export async function createSupabaseSessionClient() {
  const environment = getPublicEnvironment();
  if (!environment.ok) return environment;
  const store = await cookies();
  return success(
    createServerClient<Database>(
      environment.data.supabaseUrl,
      environment.data.publishableKey,
      {
        cookies: {
          getAll: () => store.getAll(),
          setAll: (entries) =>
            entries.forEach(({ name, value, options }) =>
              store.set(name, value, options),
            ),
        },
      },
    ),
  );
}

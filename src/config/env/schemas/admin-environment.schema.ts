import { z } from "zod";

import { supabaseUrlSchema } from "@/config/env/schemas/environment.schema";
import { isLocalServiceRoleKey } from "@/config/env/utils/is-local-service-role-key";
import { isLocalSupabaseUrl } from "@/config/env/utils/is-local-supabase-url";

export const adminEnvironmentSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrlSchema,
    SUPABASE_SECRET_KEY: z.string().min(20),
  })
  .refine(
    (input) =>
      input.SUPABASE_SECRET_KEY.startsWith("sb_secret_") ||
      (isLocalSupabaseUrl(input.NEXT_PUBLIC_SUPABASE_URL) &&
        isLocalServiceRoleKey(input.SUPABASE_SECRET_KEY)),
    {
      path: ["SUPABASE_SECRET_KEY"],
      message: "Clave administrativa inválida.",
    },
  );

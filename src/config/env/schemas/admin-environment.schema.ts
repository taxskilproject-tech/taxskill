import { z } from "zod";

import { supabaseUrlSchema } from "@/config/env/schemas/environment.schema";

export const adminEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrlSchema,
  SUPABASE_SECRET_KEY: z.string().startsWith("sb_secret_").min(20),
});

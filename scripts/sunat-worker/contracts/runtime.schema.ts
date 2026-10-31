import { z } from "zod";

export const oneJobRuntimeSchema = z.strictObject({
  SUNAT_WORKER_MODE: z.enum(["sunat", "simulator"]),
  SUNAT_SOURCE_VALIDATED: z.enum(["true", "false"]),
  SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  SUNAT_CREDENTIALS_CURRENT_KEY: z.string().min(1),
  SUNAT_CREDENTIALS_KEYS: z.string().min(1),
});

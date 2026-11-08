import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { z } from "zod";

export function loadH11LabEnvironment() {
  const config = z
    .object({
      NEXT_PUBLIC_SUPABASE_URL: z.literal("http://127.0.0.1:54631"),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
      SUPABASE_SECRET_KEY: z.string().min(1),
      IDEMPOTENCY_HMAC_KEY: z.string().min(32),
      APP_BASE_URL: z.literal("http://localhost:4011"),
      TAXSKILL_BUILD_PROFILE: z.literal("h11"),
      H11_FIXTURE_PASSWORD: z.string().min(12),
    })
    .parse(
      parseEnv(readFileSync("test-results/local/h11-lab/runtime.env", "utf8")),
    );
  const source = readFileSync(
    "test-results/local/h11-lab/supabase/config.toml",
    "utf8",
  );
  if (
    !source.includes('project_id = "tax-skill-h11"') ||
    !source.includes("port = 54632")
  )
    throw new Error("LOCAL_H11_PROJECT_REQUIRED");
  return config;
}

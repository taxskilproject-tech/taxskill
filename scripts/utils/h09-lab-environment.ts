import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { z } from "zod";

export function loadH09LabEnvironment() {
  const config = z
    .object({
      NEXT_PUBLIC_SUPABASE_URL: z.string(),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string(),
      SUPABASE_SECRET_KEY: z.string(),
      IDEMPOTENCY_HMAC_KEY: z.string(),
      APP_BASE_URL: z.string(),
      TAXSKILL_BUILD_PROFILE: z.literal("h09"),
    })
    .parse(
      parseEnv(readFileSync("test-results/local/h09-lab/runtime.env", "utf8")),
    );
  if (
    config.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54431" ||
    config.APP_BASE_URL !== "http://localhost:4002"
  )
    throw new Error(
      "H09 requiere el laboratorio local aislado 54431/4002. Se rechazan destinos remotos y el entorno de presentación.",
    );
  const container = execFileSync(
    "docker",
    ["inspect", "--format", "{{.Name}}", "supabase_db_tax-skill-h09"],
    { encoding: "utf8", windowsHide: true },
  ).trim();
  if (container !== "/supabase_db_tax-skill-h09")
    throw new Error("Contenedor H09 no verificado.");
  for (const [key, value] of Object.entries(config)) {
    if (!value)
      throw new Error(
        "Configuración privada incompleta; no se muestran valores.",
      );
    process.env[key] = value;
  }
  return config;
}

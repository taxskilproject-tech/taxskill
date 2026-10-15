import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
const secrets = [
  process.env.SUPABASE_SECRET_KEY,
  process.env.IDEMPOTENCY_HMAC_KEY,
].filter((value): value is string => Boolean(value));
if (secrets.length !== 2)
  throw new Error(
    "Configura las dos claves privadas antes de verificar el bundle.",
  );
function inspect(directory: string): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      inspect(path);
      continue;
    }
    const content = readFileSync(path, "utf8");
    if (secrets.some((secret) => content.includes(secret)))
      throw new Error(
        "Credencial privada detectada en un recurso de navegador: " + path,
      );
  }
}
inspect(".next/static");
console.info(
  "Bundle del navegador verificado: sin clave administrativa ni clave HMAC.",
);

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

import { adminEnvironmentSchema } from "../src/config/env/schemas/admin-environment.schema";
import { isLocalSupabaseUrl } from "../src/config/env/utils/is-local-supabase-url";
import { isPublishableKey } from "../src/config/env/utils/validate-public-key";
import { CLOUD_APPLICATION_ENV_FILE } from "./constants/environment-files";
import {
  parseEnvironment,
  readEnvironmentFile,
  saveEnvironmentFile,
} from "./utils/environment-file";
import { runSupabase } from "./utils/run-supabase";

const destination = ".env.local";
const backup = CLOUD_APPLICATION_ENV_FILE;

function readLocalStatus() {
  try {
    return parseEnv(runSupabase(["status", "--output", "env"]));
  } catch {
    throw new Error(
      "Supabase local no está disponible. Inicia el motor Docker y ejecuta yarn db:local:start. No se cambió .env.local.",
    );
  }
}
function preserveCloudConfiguration(contents: string) {
  const current = parseEnvironment(contents);
  if (existsSync(backup)) {
    const preserved = readEnvironmentFile(backup);
    if (
      Object.entries(current).some(
        ([name, value]) =>
          preserved[name] !== undefined && preserved[name] !== value,
      )
    )
      throw new Error(
        "Existe otro respaldo Cloud; no se sobrescribe ninguna configuración.",
      );
    saveEnvironmentFile(backup, { ...preserved, ...current });
    return;
  }
  saveEnvironmentFile(backup, current);
}
function main() {
  const status = readLocalStatus();
  const url = status.API_URL;
  const publicKey = status.PUBLISHABLE_KEY || status.ANON_KEY || "";
  const secret = status.SECRET_KEY || status.SERVICE_ROLE_KEY || "";
  if (!isLocalSupabaseUrl(url) || !isPublishableKey(publicKey))
    throw new Error(
      "Supabase local no devolvió una configuración válida. No se cambió .env.local.",
    );
  const validated = adminEnvironmentSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: url,
    SUPABASE_SECRET_KEY: secret,
  });
  if (!validated.success)
    throw new Error(
      "La clave administrativa local no es válida. No se muestran valores.",
    );
  const current = existsSync(destination)
    ? readFileSync(destination, "utf8")
    : "";
  const previous = parseEnvironment(current);
  const wasLocal = isLocalSupabaseUrl(previous.NEXT_PUBLIC_SUPABASE_URL);
  if (current && !wasLocal) preserveCloudConfiguration(current);
  const hmac =
    wasLocal && previous.IDEMPOTENCY_HMAC_KEY
      ? previous.IDEMPOTENCY_HMAC_KEY
      : randomBytes(32).toString("hex");
  saveEnvironmentFile(destination, {
    ...(wasLocal ? previous : {}),
    NEXT_PUBLIC_SUPABASE_URL: url ?? "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicKey,
    SUPABASE_SECRET_KEY: secret,
    IDEMPOTENCY_HMAC_KEY: hmac,
  });
  console.info(
    "Configuración Docker local preparada. Cloud se conserva en .envs/cloud/application.env si existía; reinicia y recompila Next.js. No se imprimen secretos.",
  );
}
try {
  main();
} catch (cause) {
  console.error(
    cause instanceof Error ? cause.message : "Configuración local incompleta.",
  );
  process.exitCode = 1;
}

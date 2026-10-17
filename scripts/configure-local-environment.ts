import { randomBytes } from "node:crypto";
import {
  constants,
  copyFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { parseEnv } from "node:util";

import { adminEnvironmentSchema } from "../src/config/env/schemas/admin-environment.schema";
import { isLocalSupabaseUrl } from "../src/config/env/utils/is-local-supabase-url";
import { isPublishableKey } from "../src/config/env/utils/validate-public-key";
import { runSupabase } from "./utils/run-supabase";

const destination = ".env.local";
const backup = ".env.cloud.local";

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
  if (existsSync(backup)) {
    if (readFileSync(backup, "utf8") !== contents)
      throw new Error(
        "Existe otro respaldo Cloud; no se sobrescribe ninguna configuración.",
      );
    return;
  }
  copyFileSync(destination, backup, constants.COPYFILE_EXCL);
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
  const previous = parseEnv(current);
  const wasLocal = isLocalSupabaseUrl(previous.NEXT_PUBLIC_SUPABASE_URL);
  if (current && !wasLocal) preserveCloudConfiguration(current);
  const hmac =
    wasLocal && previous.IDEMPOTENCY_HMAC_KEY
      ? previous.IDEMPOTENCY_HMAC_KEY
      : randomBytes(32).toString("hex");
  writeFileSync(
    destination,
    [
      `NEXT_PUBLIC_SUPABASE_URL=${url}`,
      `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publicKey}`,
      `SUPABASE_SECRET_KEY=${secret}`,
      `IDEMPOTENCY_HMAC_KEY=${hmac}`,
      "",
    ].join("\n"),
  );
  console.info(
    "Configuración Docker local preparada. Cloud se conserva en .env.cloud.local si existía; reinicia y recompila Next.js. No se imprimen secretos.",
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

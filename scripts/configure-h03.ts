import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

import { isLocalSupabaseUrl } from "../src/config/env/utils/is-local-supabase-url";
import { CLOUD_EDGE_ENV_FILE } from "./constants/environment-files";
import { LOCAL_H03_SECRET_FILE } from "./constants/local-environment";
import { ensureEnvironmentDirectory } from "./utils/environment-file";

loadEnvConfig(process.cwd());
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SECRET_KEY ?? "",
  { auth: { persistSession: false } },
);
const secretPath = isLocalSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  ? LOCAL_H03_SECRET_FILE
  : CLOUD_EDGE_ENV_FILE;
async function main() {
  const existing = await admin.storage.listBuckets();
  if (existing.error) throw new Error("No se pudieron consultar los buckets.");
  for (const id of ["document-reception", "documents"]) {
    if (existing.data.some((bucket) => bucket.id === id)) continue;
    const created = await admin.storage.createBucket(id, {
      public: false,
      fileSizeLimit: 50_000_000,
    });
    if (created.error) throw new Error(`No se pudo crear el bucket ${id}.`);
  }
  const previous = existsSync(secretPath)
    ? parseEnv(readFileSync(secretPath, "utf8"))
    : {};
  const functionEnvironment = {
    ...previous,
    H03_CLEANUP_SECRET:
      previous.H03_CLEANUP_SECRET || randomBytes(32).toString("hex"),
    H03_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  };
  ensureEnvironmentDirectory(secretPath);
  writeFileSync(
    secretPath,
    Object.entries(functionEnvironment)
      .map(([name, value]) => `${name}=${value}`)
      .join("\n") + "\n",
  );
  if (process.argv.includes("--schedule")) {
    const secret = parseEnv(
      readFileSync(secretPath, "utf8"),
    ).H03_CLEANUP_SECRET;
    const scheduled = await admin.rpc("h03_schedule_cleanup", {
      p_base_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      p_cleanup_secret: secret,
    });
    if (scheduled.error)
      throw new Error("No se pudo programar la limpieza de staging.");
    console.log(
      "Limpieza horaria de staging programada; credencial conservada en Vault y Edge.",
    );
  }
  console.log(
    "Buckets privados listos. Credencial de mantenimiento en archivo local ignorado; ningún secreto se imprime.",
  );
}
main().catch(() => {
  console.error(
    "No se completó la configuración H03; comprueba el entorno administrativo y las migraciones.",
  );
  process.exitCode = 1;
});

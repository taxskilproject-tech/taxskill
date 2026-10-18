import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "../../../src/lib/supabase/types/database.types";
import { LOCAL_RECOVERY_ENV_FILE } from "../../constants/environment-files";
import { requireLocalTestEnvironment } from "../../utils/require-local-test-environment";
import type { BackupContext, BackupMode } from "../types/recovery.types";

export function backupMode(argument: string | undefined): BackupMode {
  if (argument === "--local") return "local";
  if (argument === "--cloud") return "cloud";
  throw new Error("Selecciona explícitamente --local o --cloud.");
}
export function backupStorageContext(mode: BackupMode): BackupContext {
  loadEnvConfig(process.cwd());
  const localConfiguration = LOCAL_RECOVERY_ENV_FILE;
  if (
    mode === "local" &&
    existsSync(localConfiguration) &&
    !process.env.H08_BACKUP_ENCRYPTION_KEY
  )
    process.env.H08_BACKUP_ENCRYPTION_KEY = parseEnv(
      readFileSync(localConfiguration, "utf8"),
    ).H08_BACKUP_ENCRYPTION_KEY;
  const url =
    mode === "local"
      ? requireLocalTestEnvironment()
      : process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (mode === "cloud" && url !== "https://gzwrqvqofcrdjvzoblaz.supabase.co")
    throw new Error(
      "El respaldo productivo requiere el proyecto Cloud autorizado.",
    );
  const key = process.env.H08_BACKUP_ENCRYPTION_KEY ?? "";
  const destination =
    mode === "local"
      ? "local"
      : z
          .enum(["s3", "supabase-storage"])
          .parse(process.env.H08_BACKUP_DESTINATION ?? "s3");
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret || !/^[a-f0-9]{64}$/i.test(key))
    throw new Error("Configuración privada del respaldo incompleta.");
  return {
    mode,
    destination,
    key,
    directory: resolve("test-results", "h08-backups", mode),
    client: createClient<Database>(url, secret, {
      auth: { persistSession: false },
    }),
  };
}

export function backupContext(mode: BackupMode): BackupContext {
  const context = backupStorageContext(mode);
  if (
    mode === "cloud" &&
    (!process.env.H08_DATABASE_URL ||
      !process.env.H08_DATABASE_CA_CERT ||
      (context.destination === "s3" && !process.env.H08_BACKUP_S3_URI))
  )
    throw new Error(
      "Configura conexión PostgreSQL, certificado CA y el destino elegido antes de respaldar Cloud.",
    );
  return context;
}

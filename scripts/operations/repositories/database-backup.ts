import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

import type { BackupMode } from "../types/recovery.types";

const POSTGRES_IMAGE = "public.ecr.aws/supabase/postgres:17.11.0.003";
const MAX_DUMP_BYTES = 512 * 1024 * 1024;

export function databaseProcess(
  mode: BackupMode,
  command: string,
  args: readonly string[],
  input?: Buffer,
  container = "supabase_db_tax-skill",
): Buffer {
  if (
    mode === "local" &&
    container !== "supabase_db_tax-skill" &&
    !/^supabase_db_tax-skill-h08-source-[a-z0-9-]+$/.test(container)
  )
    throw new Error("Origen Docker de respaldo no autorizado.");
  const variables = { ...process.env };
  let dockerArguments = [
    "exec",
    "-i",
    container,
    command,
    "-U",
    "postgres",
    "-d",
    "postgres",
    ...args,
  ];
  if (mode === "cloud") {
    const url = new URL(process.env.H08_DATABASE_URL ?? "");
    const direct =
      url.hostname === "db.gzwrqvqofcrdjvzoblaz.supabase.co" &&
      url.username === "postgres";
    const pooler =
      url.hostname.endsWith(".pooler.supabase.com") &&
      url.username === "postgres.gzwrqvqofcrdjvzoblaz";
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !(direct || pooler) ||
      (url.port && url.port !== "5432") ||
      url.pathname !== "/postgres"
    )
      throw new Error("Conexión PostgreSQL productiva no autorizada.");
    const certificate = process.env.H08_DATABASE_CA_CERT;
    if (!certificate || !existsSync(certificate))
      throw new Error(
        "Falta el certificado CA del proyecto para verificar TLS.",
      );
    Object.assign(variables, {
      PGHOST: url.hostname,
      PGPORT: url.port || "5432",
      PGDATABASE: url.pathname.slice(1),
      PGUSER: decodeURIComponent(url.username),
      PGPASSWORD: decodeURIComponent(url.password),
      PGSSLMODE: "verify-full",
      PGSSLROOTCERT: "/tmp/taxskill-ca.crt",
    });
    const names = [
      "PGHOST",
      "PGPORT",
      "PGDATABASE",
      "PGUSER",
      "PGPASSWORD",
      "PGSSLMODE",
      "PGSSLROOTCERT",
    ];
    dockerArguments = [
      "run",
      "--rm",
      "-i",
      "--mount",
      `type=bind,source=${resolve(certificate)},target=/tmp/taxskill-ca.crt,readonly`,
      ...names.flatMap((name) => ["--env", name]),
      POSTGRES_IMAGE,
      command,
      ...args,
    ];
  }
  const result = spawnSync("docker", dockerArguments, {
    input,
    env: variables,
    maxBuffer: MAX_DUMP_BYTES,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    const code =
      result.error && "code" in result.error
        ? String(result.error.code)
        : String(result.status);
    throw new Error(
      `La operación PostgreSQL ${command} no pudo completarse (${code}). Revisa el ejecutor sin compartir credenciales.`,
    );
  }
  return result.stdout;
}
export function dumpDatabase(mode: BackupMode, container?: string): Buffer {
  return databaseProcess(
    mode,
    "pg_dump",
    [
      "--format=custom",
      "--data-only",
      "--no-owner",
      "--no-acl",
      "--table=public.*",
      "--table=auth.users",
      "--table=auth.identities",
      "--table=private.h08_recovery_runs",
    ],
    undefined,
    container,
  );
}
export function databaseMigrations(
  mode: BackupMode,
  container?: string,
): string[] {
  const result = databaseProcess(
    mode,
    "psql",
    [
      "-Atc",
      "select coalesce(jsonb_agg(version order by version),'[]') from supabase_migrations.schema_migrations",
    ],
    undefined,
    container,
  );
  return z
    .array(z.string().regex(/^\d{14}$/))
    .parse(JSON.parse(result.toString("utf8")));
}

import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/supabase/types/database.types";
import { LOCAL_RECOVERY_ENV_FILE } from "./constants/environment-files";
import { databaseProcess } from "./operations/repositories/database-backup";
import { createRecoveryFixture } from "./operations/repositories/recovery-fixture";
import {
  prepareRecoveryProject,
  startRecoveryProject,
} from "./operations/repositories/recovery-project";
import { restoreQuery } from "./operations/repositories/restore-database";
import { storageBackupIndex } from "./operations/repositories/supabase-backup";
import { createBackup } from "./operations/services/create-backup";
import { fetchStorageBackup } from "./operations/services/fetch-storage-backup";
import { restoreBackup } from "./operations/services/restore-backup";
import type { BackupContext } from "./operations/types/recovery.types";
import { backupHash } from "./operations/utils/backup-crypto";
import { backupContext } from "./operations/utils/backup-environment";
import { historyFingerprintSql } from "./operations/utils/history-fingerprint";
import { ensureEnvironmentDirectory } from "./utils/environment-file";
import { requireLocalTestEnvironment } from "./utils/require-local-test-environment";
import { runSupabase } from "./utils/run-supabase";

async function main() {
  requireLocalTestEnvironment();
  const keyFile = LOCAL_RECOVERY_ENV_FILE;
  ensureEnvironmentDirectory(keyFile);
  if (!existsSync(keyFile))
    writeFileSync(
      keyFile,
      "H08_BACKUP_ENCRYPTION_KEY=" + randomBytes(32).toString("hex") + "\n",
      { flag: "wx" },
    );
  const originalContext = backupContext("local");
  const source = prepareRecoveryProject("source");
  const destination = prepareRecoveryProject("restore");
  const started: string[] = [];
  try {
    console.info(
      "Preparando fuente Docker aislada con documento real de prueba...",
    );
    started.push(source.project);
    const sourceStatus = startRecoveryProject(source.root, "source");
    const sourceDatabase = {
      container: "supabase_db_" + source.project,
      url: sourceStatus.url,
      secret: sourceStatus.secret,
    };
    const fixture = await createRecoveryFixture(
      sourceDatabase,
      sourceStatus.publicKey,
    );
    const context = {
      ...originalContext,
      client: fixture.admin,
      container: sourceDatabase.container,
    };
    const storageContext: BackupContext = {
      ...context,
      destination: "supabase-storage",
    };
    const before = databaseProcess(
      "local",
      "psql",
      ["-Atc", historyFingerprintSql()],
      undefined,
      context.container,
    )
      .toString("utf8")
      .trim();
    const backupStart = performance.now();
    await createBackup(context);
    const storedDirectory = await createBackup(storageContext);
    const storageRunId = storedDirectory.split(/[\\/]/).at(-1);
    if (!storageRunId) throw new Error("Falta el identificador del respaldo.");
    const firstIndex = await storageBackupIndex(storageContext);
    await createBackup(storageContext);
    const secondIndex = await storageBackupIndex(storageContext);
    if (JSON.stringify([...firstIndex]) !== JSON.stringify([...secondIndex]))
      throw new Error("La copia incremental duplicó objetos compartidos.");
    const directory = await fetchStorageBackup(storageContext, storageRunId);
    await fixture.client.auth.signOut({ scope: "local" });
    const backupMs = performance.now() - backupStart;
    const restoreStart = performance.now();
    console.info(
      "Instalando destino vacío, ejecutando regresiones y restaurando DB/objetos...",
    );
    started.push(destination.project);
    const status = startRecoveryProject(destination.root, "restore");
    const target = {
      container: "supabase_db_" + destination.project,
      url: status.url,
      secret: status.secret,
    };
    const sqlEvidence = runSupabase([
      "test",
      "db",
      "--local",
      "--workdir",
      destination.root,
    ]);
    writeFileSync(join(destination.root, "sql-evidence.log"), sqlEvidence);
    const manifest = await restoreBackup(directory, context.key, target);
    const expiredDownload = await fetch(fixture.previousDownloadUrl);
    if (expiredDownload.ok)
      throw new Error(
        "La descarga anterior no venció dentro del plazo comprobado.",
      );
    if (!manifest.objects.length)
      throw new Error(
        "El ensayo necesita versiones con bytes reales, no solo metadatos.",
      );
    if (before !== restoreQuery(target, historyFingerprintSql()))
      throw new Error(
        "INTEGRITY_FAILED: las 13 huellas históricas no coinciden.",
      );
    if (
      restoreQuery(target, "select count(*) from cron.job") !== "0" ||
      restoreQuery(
        target,
        "select count(*) from public.app_sessions where revoked_at is null",
      ) !== "0"
    )
      throw new Error("El ensayo no dejó sesiones/jobs inactivos.");
    if (
      restoreQuery(
        target,
        "select count(*) from public.app_sessions where revocation_reason='isolated_restore'",
      ) === "0"
    )
      throw new Error(
        "El ensayo debe revocar al menos una sesión activa del respaldo.",
      );
    const oldSession = createClient<Database>(target.url, status.publicKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: "Bearer " + fixture.accessToken } },
    });
    const oldRead = await oldSession.from("organizations").select("id");
    if (!oldRead.error && oldRead.data?.length)
      throw new Error("Una sesión restaurada conservó acceso.");
    const client = createClient<Database>(target.url, status.publicKey, {
      auth: { persistSession: false },
    });
    const login = await client.auth.signInWithPassword({
      email: fixture.email,
      password: fixture.password,
    });
    const access = await client.rpc("h02_context");
    if (
      login.error ||
      access.error ||
      !JSON.stringify(access.data).includes('"ok":true')
    )
      throw new Error("No se pudo verificar login nuevo después de recuperar.");
    await client.auth.signOut({ scope: "local" });
    const evidence = {
      passed: true,
      storage_backup_fetched: true,
      storage_incremental: true,
      target: "Dos proyectos Docker aislados",
      backup_ms: backupMs,
      recovery_ms: performance.now() - restoreStart,
      migrations: manifest.migrations.length,
      history_fingerprints: 13,
      objects: manifest.objects.length,
      verified_bytes: manifest.objects.reduce(
        (sum, object) => sum + object.bytes,
        0,
      ),
      sessions_revoked: true,
      jobs_disabled: true,
      fresh_login: true,
      allowed_download: true,
      raw_signing_denied: true,
      removed_permission_denies_download: true,
      previous_download_expired: true,
    };
    writeFileSync(
      "test-results/local/h08/recovery.json",
      JSON.stringify(evidence, null, 2),
    );
    const completed = await context.client.rpc("h08_record_recovery", {
      p_id: randomUUID(),
      p_kind: "restore",
      p_status: "succeeded",
      p_manifest_sha256: backupHash(Buffer.from(JSON.stringify(manifest))),
      p_object_count: evidence.objects,
      p_verified_bytes: evidence.verified_bytes,
    });
    if (completed.error)
      throw new Error(
        "La recuperación pasó, pero no pudo registrarse en la fuente aislada.",
      );
    console.info(JSON.stringify(evidence));
  } finally {
    for (const project of started.toReversed())
      runSupabase(["stop", "--project-id", project]);
  }
}
void main().catch((cause: unknown) => {
  console.error(
    cause instanceof Error
      ? cause.message
      : "Ensayo local de recuperación incompleto.",
  );
  process.exitCode = 1;
});

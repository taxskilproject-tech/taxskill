import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../../src/lib/supabase/types/database.types";
import { recoveryManifestSchema } from "../contracts/recovery.schema";
import { downloadBackupObject } from "../repositories/independent-backup";
import {
  assertRestoreTarget,
  restoreProcess,
  restoreQuery,
  validateRestoredRelations,
} from "../repositories/restore-database";
import type { RecoveryDatabase } from "../types/recovery.types";
import { backupHash, decryptBackup } from "../utils/backup-crypto";

export async function restoreBackup(
  directory: string,
  key: string,
  target: RecoveryDatabase,
) {
  assertRestoreTarget(target);
  const manifestBytes = decryptBackup(
    readFileSync(join(directory, "manifest.enc")),
    key,
  );
  const manifest = recoveryManifestSchema.parse(
    JSON.parse(manifestBytes.toString("utf8")),
  );
  const database = decryptBackup(
    readFileSync(join(directory, "database.enc")),
    key,
  );
  if (backupHash(database) !== manifest.database_sha256)
    throw new Error("INTEGRITY_FAILED");
  mkdirSync(join(directory, "objects"), { recursive: true });
  for (const object of manifest.objects) {
    if (
      manifest.backup_destination === "supabase-storage" &&
      !existsSync(resolve(directory, object.file))
    )
      throw new Error(
        "Descarga y verifica la copia completa con yarn backup:fetch antes de restaurar.",
      );
    if (
      manifest.source !== "local" &&
      !existsSync(resolve(directory, object.file))
    )
      downloadBackupObject(resolve(directory, object.file), key, object.sha256);
    const bytes = decryptBackup(
      readFileSync(resolve(directory, object.file)),
      key,
    );
    if (backupHash(bytes) !== object.sha256 || bytes.length !== object.bytes)
      throw new Error("INTEGRITY_FAILED");
  }
  if (
    restoreQuery(target, "select count(*) from public.organizations") !== "0" ||
    restoreQuery(target, "select count(*) from auth.users") !== "0"
  )
    throw new Error("El destino de restauración debe estar vacío.");
  const migrations = JSON.parse(
    restoreQuery(
      target,
      "select jsonb_agg(version order by version) from supabase_migrations.schema_migrations",
    ),
  );
  if (JSON.stringify(migrations) !== JSON.stringify(manifest.migrations))
    throw new Error(
      "Instala exactamente las migraciones registradas en el respaldo.",
    );
  // Only this empty, isolated target admits trigger-disabled data restore; source history is never modified.
  restoreProcess(
    target,
    "pg_restore",
    [
      "--data-only",
      "--no-owner",
      "--no-acl",
      "--disable-triggers",
      "--single-transaction",
      "--exit-on-error",
    ],
    database,
  );
  restoreQuery(
    target,
    `begin;
    select cron.unschedule(jobid) from cron.job;
    update public.app_sessions set revoked_at=now(),revocation_reason='isolated_restore',updated_at=now(),revision=revision+1 where revoked_at is null;
    delete from auth.sessions;
    update private.h08_recovery_runs set status='failed',completed_at=now(),error_code='BACKUP_FAILED' where status='running';
    commit;`,
  );
  validateRestoredRelations(target);
  const client = createClient<Database>(target.url, target.secret, {
    auth: { persistSession: false },
  });
  const buckets = await client.storage.listBuckets();
  if (buckets.error)
    throw new Error("No se pudo preparar Storage privado restaurado.");
  for (const bucket of ["documents", "document-reception"]) {
    if (buckets.data.some((existing) => existing.id === bucket)) continue;
    const created = await client.storage.createBucket(bucket, {
      public: false,
      fileSizeLimit: manifest.objects.reduce(
        (maximum, object) => Math.max(maximum, object.bytes),
        20_000_000,
      ),
    });
    if (created.error)
      throw new Error("No se pudo crear el bucket privado restaurado.");
  }
  for (const object of manifest.objects) {
    const bytes = decryptBackup(
      readFileSync(join(directory, object.file)),
      key,
    );
    const uploaded = await client.storage
      .from(object.bucket)
      .upload(object.path, bytes, {
        upsert: false,
        contentType: object.mime,
        cacheControl: "0",
      });
    if (uploaded.error)
      throw new Error("No se pudo restaurar un objeto privado.");
    const downloaded = await client.storage
      .from(object.bucket)
      .download(object.path);
    if (
      downloaded.error ||
      !downloaded.data ||
      backupHash(new Uint8Array(await downloaded.data.arrayBuffer())) !==
        object.sha256
    )
      throw new Error("INTEGRITY_FAILED");
  }
  const result = await client.rpc("h08_record_recovery", {
    p_id: randomUUID(),
    p_kind: "restore",
    p_status: "succeeded",
    p_manifest_sha256: backupHash(manifestBytes),
    p_object_count: manifest.objects.length,
    p_verified_bytes: manifest.objects.reduce(
      (sum, object) => sum + object.bytes,
      0,
    ),
  });
  if (result.error)
    throw new Error("No se pudo registrar la recuperación comprobada.");
  return manifest;
}

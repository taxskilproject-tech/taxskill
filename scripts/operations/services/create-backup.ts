import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { recoveryManifestSchema } from "../contracts/recovery.schema";
import {
  backupDestination,
  publishDestinationBackup,
} from "../repositories/backup-destination";
import { copyBackupObjects } from "../repositories/backup-storage";
import {
  databaseMigrations,
  dumpDatabase,
} from "../repositories/database-backup";
import type { BackupContext } from "../types/recovery.types";
import { backupHash, encryptBackup } from "../utils/backup-crypto";

export async function createBackup(context: BackupContext): Promise<string> {
  const id = randomUUID();
  const started = await context.client.rpc("h08_record_recovery", {
    p_id: id,
    p_kind: "backup",
    p_status: "running",
  });
  if (started.error)
    throw new Error("No se pudo registrar el comienzo del respaldo.");
  const directory = join(context.directory, id);
  mkdirSync(directory, { recursive: true });
  try {
    const migrations = databaseMigrations(context.mode, context.container);
    const database = dumpDatabase(context.mode, context.container);
    writeFileSync(
      join(directory, "database.enc"),
      encryptBackup(database, context.key),
      { flag: "wx" },
    );
    const objects = await copyBackupObjects(context, directory);
    const manifest = recoveryManifestSchema.parse({
      schema_version: 1,
      id,
      created_at: new Date().toISOString(),
      source: context.mode === "local" ? "local" : "gzwrqvqofcrdjvzoblaz",
      backup_destination: backupDestination(context),
      database_sha256: backupHash(database),
      migrations,
      objects,
    });
    const manifestBytes = Buffer.from(JSON.stringify(manifest));
    writeFileSync(
      join(directory, "manifest.enc"),
      encryptBackup(manifestBytes, context.key),
      { flag: "wx" },
    );
    await publishDestinationBackup(context, directory, id);
    const completed = await context.client.rpc("h08_record_recovery", {
      p_id: id,
      p_kind: "backup",
      p_status: "succeeded",
      p_manifest_sha256: backupHash(manifestBytes),
      p_object_count: objects.length,
      p_verified_bytes: objects.reduce((sum, object) => sum + object.bytes, 0),
    });
    if (completed.error)
      throw new Error(
        "El respaldo existe, pero no pudo confirmarse su registro operativo.",
      );
    return directory;
  } catch (cause) {
    const failed = await context.client.rpc("h08_record_recovery", {
      p_id: id,
      p_kind: "backup",
      p_status: "failed",
      p_error_code: "BACKUP_FAILED",
    });
    if (failed.error)
      throw new Error(
        "Respaldo fallido; tampoco pudo registrarse el incidente.",
      );
    throw cause;
  }
}

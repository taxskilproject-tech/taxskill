import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

import { recoveryManifestSchema } from "../contracts/recovery.schema";
import {
  downloadStorageBackup,
  storageBackupObjectPath,
} from "../repositories/supabase-backup";
import type { BackupContext } from "../types/recovery.types";
import { backupHash, decryptBackup } from "../utils/backup-crypto";

export async function fetchStorageBackup(
  context: BackupContext,
  runId: string,
) {
  const id = z.uuid().parse(runId);
  const directory = join(context.directory, "fetched", id);
  if (existsSync(directory))
    throw new Error(
      "El destino descargado ya existe; se conserva sin sobrescribir.",
    );
  const encryptedManifest = await downloadStorageBackup(
    context,
    `runs/${id}/manifest.enc`,
  );
  const manifest = recoveryManifestSchema.parse(
    JSON.parse(decryptBackup(encryptedManifest, context.key).toString("utf8")),
  );
  const source = context.mode === "local" ? "local" : "gzwrqvqofcrdjvzoblaz";
  if (
    manifest.id !== id ||
    manifest.source !== source ||
    manifest.backup_destination !== "supabase-storage"
  )
    throw new Error(
      "El manifiesto no pertenece al origen y destino autorizados.",
    );
  const database = await downloadStorageBackup(
    context,
    `runs/${id}/database.enc`,
  );
  if (
    backupHash(decryptBackup(database, context.key)) !==
    manifest.database_sha256
  )
    throw new Error("INTEGRITY_FAILED");
  mkdirSync(join(directory, "objects"), { recursive: true });
  writeFileSync(join(directory, "manifest.enc"), encryptedManifest, {
    flag: "wx",
    mode: 0o600,
  });
  writeFileSync(join(directory, "database.enc"), database, {
    flag: "wx",
    mode: 0o600,
  });
  for (const object of manifest.objects) {
    const file = join(directory, object.file);
    if (existsSync(file)) continue;
    const encrypted = await downloadStorageBackup(
      context,
      storageBackupObjectPath(context.key, object.sha256),
    );
    const bytes = decryptBackup(encrypted, context.key);
    if (bytes.length !== object.bytes || backupHash(bytes) !== object.sha256)
      throw new Error("INTEGRITY_FAILED");
    writeFileSync(file, encrypted, { flag: "wx", mode: 0o600 });
  }
  return directory;
}

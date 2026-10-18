import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  BACKUP_STORAGE_BUCKET,
  BACKUP_STORAGE_FILE_LIMIT,
  BACKUP_STORAGE_PAGE_SIZE,
} from "../constants/backup-storage";
import type { BackupContext } from "../types/recovery.types";
import { backupHash } from "../utils/backup-crypto";
import { storageBackupEntries } from "../utils/backup-storage-index";

export function storageBackupObjectPath(key: string, hash: string): string {
  const keyId = backupHash(Buffer.from(key, "hex")).slice(0, 16);
  return `objects/${keyId}/${hash}.enc`;
}

export async function ensureBackupBucket(context: BackupContext) {
  const bucket = await context.client.storage.getBucket(BACKUP_STORAGE_BUCKET);
  if (bucket.data) {
    if (bucket.data.public)
      throw new Error("El bucket de respaldo debe ser privado.");
    return;
  }
  const created = await context.client.storage.createBucket(
    BACKUP_STORAGE_BUCKET,
    {
      public: false,
      fileSizeLimit: BACKUP_STORAGE_FILE_LIMIT,
      allowedMimeTypes: ["application/octet-stream"],
    },
  );
  if (created.error)
    throw new Error("No se pudo preparar el bucket privado de respaldo.");
}

export async function storageBackupIndex(context: BackupContext) {
  await ensureBackupBucket(context);
  const prefix = storageBackupObjectPath(context.key, "").replace(
    /\/\.enc$/,
    "",
  );
  const entries = new Map<string, number>();
  let offset = 0;
  while (true) {
    const result = await context.client.storage
      .from(BACKUP_STORAGE_BUCKET)
      .list(prefix, {
        limit: BACKUP_STORAGE_PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
    if (result.error)
      throw new Error("No se pudo inventariar el respaldo de Storage.");
    for (const [path, size] of storageBackupEntries(result.data, prefix))
      entries.set(path, size);
    if (result.data.length < BACKUP_STORAGE_PAGE_SIZE) return entries;
    offset += BACKUP_STORAGE_PAGE_SIZE;
  }
}

export async function uploadStorageBackup(
  context: BackupContext,
  file: string,
  path: string,
) {
  const bytes = readFileSync(file);
  const uploaded = await context.client.storage
    .from(BACKUP_STORAGE_BUCKET)
    .upload(path, bytes, {
      contentType: "application/octet-stream",
      cacheControl: "0",
      upsert: false,
    });
  if (uploaded.error)
    throw new Error("No se pudo copiar el respaldo cifrado a Storage.");
}

export async function publishStorageBackup(
  context: BackupContext,
  directory: string,
  id: string,
) {
  await ensureBackupBucket(context);
  for (const file of ["database.enc", "manifest.enc"])
    await uploadStorageBackup(
      context,
      join(directory, file),
      `runs/${id}/${file}`,
    );
}

export async function downloadStorageBackup(
  context: BackupContext,
  path: string,
): Promise<Buffer> {
  const downloaded = await context.client.storage
    .from(BACKUP_STORAGE_BUCKET)
    .download(path);
  if (downloaded.error || !downloaded.data)
    throw new Error("No se pudo descargar el respaldo cifrado de Storage.");
  return Buffer.from(await downloaded.data.arrayBuffer());
}

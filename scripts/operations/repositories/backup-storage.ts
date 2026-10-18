import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type {
  BackupContext,
  BackupObject,
  BackupVersion,
} from "../types/recovery.types";
import {
  BACKUP_ENVELOPE_BYTES,
  backupHash,
  encryptBackup,
} from "../utils/backup-crypto";
import {
  destinationObjectIndex,
  destinationObjectPath,
  publishDestinationObject,
} from "./backup-destination";

async function copyVersion(
  context: BackupContext,
  directory: string,
  existing: ReadonlyMap<string, number>,
  version: BackupVersion,
): Promise<BackupObject> {
  if (version.storage_bucket !== "documents")
    throw new Error("Bucket final no reconocido.");
  const file = `objects/${version.sha256}.enc`;
  const object: BackupObject = {
    bucket: "documents",
    path: version.storage_path,
    file,
    bytes: version.validated_bytes,
    sha256: version.sha256,
    mime: version.validated_mime,
  };
  const storedSize = existing.size
    ? existing.get(destinationObjectPath(context, version.sha256))
    : undefined;
  if (storedSize === version.validated_bytes + BACKUP_ENVELOPE_BYTES)
    return object;
  if (storedSize !== undefined) throw new Error("INTEGRITY_FAILED");
  const downloaded = await context.client.storage
    .from(version.storage_bucket)
    .download(version.storage_path);
  if (downloaded.error || !downloaded.data)
    throw new Error("Falta un objeto confirmado en el respaldo.");
  const bytes = Buffer.from(await downloaded.data.arrayBuffer());
  if (
    backupHash(bytes) !== version.sha256 ||
    bytes.length !== version.validated_bytes
  )
    throw new Error("INTEGRITY_FAILED");
  if (!existsSync(join(directory, file))) {
    writeFileSync(join(directory, file), encryptBackup(bytes, context.key), {
      flag: "wx",
    });
    await publishDestinationObject(
      context,
      join(directory, file),
      version.sha256,
    );
  }
  return object;
}
export async function copyBackupObjects(
  context: BackupContext,
  directory: string,
): Promise<BackupObject[]> {
  const objects: BackupObject[] = [];
  const existing = await destinationObjectIndex(context);
  let cursor: string | undefined;
  mkdirSync(join(directory, "objects"), { recursive: true });
  while (true) {
    let query = context.client
      .from("document_versions")
      .select(
        "id,storage_bucket,storage_path,sha256,validated_bytes,validated_mime",
      )
      .order("id")
      .limit(1000);
    if (cursor) query = query.gt("id", cursor);
    const batch = await query;
    if (batch.error || !batch.data)
      throw new Error("No se pudo inventariar las versiones confirmadas.");
    for (const version of batch.data)
      objects.push(await copyVersion(context, directory, existing, version));
    if (batch.data.length < 1000) return objects;
    cursor = batch.data.at(-1)?.id;
  }
}

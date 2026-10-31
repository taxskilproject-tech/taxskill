import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

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
  if (!["documents", "sunat-mailbox"].includes(version.storage_bucket))
    throw new Error("Bucket final no reconocido.");
  const file = `objects/${version.sha256}.enc`;
  const object: BackupObject = {
    bucket:
      version.storage_bucket === "sunat-mailbox"
        ? "sunat-mailbox"
        : "documents",
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
    if (batch.data.length < 1000) break;
    cursor = batch.data.at(-1)?.id;
  }
  cursor = undefined;
  while (true) {
    let query = context.client
      .from("sunat_attachments")
      .select("id,object_name,sha256,byte_size,mime_type")
      .eq("state", "cached")
      .order("id")
      .limit(1000);
    if (cursor) query = query.gt("id", cursor);
    const batch = await query;
    if (batch.error || !batch.data)
      throw new Error("No se pudo inventariar los adjuntos SUNAT confirmados.");
    for (const attachment of batch.data) {
      const object = sunatBackupAttachmentSchema.parse(attachment);
      objects.push(
        await copyVersion(context, directory, existing, {
          storage_bucket: "sunat-mailbox",
          storage_path: object.object_name,
          sha256: object.sha256,
          validated_bytes: object.byte_size,
          validated_mime: object.mime_type,
        }),
      );
    }
    if (batch.data.length < 1000) return objects;
    cursor = batch.data.at(-1)?.id;
  }
}

const sunatBackupAttachmentSchema = z.object({
  object_name: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  byte_size: z.number().int().nonnegative(),
  mime_type: z.string().min(1),
});

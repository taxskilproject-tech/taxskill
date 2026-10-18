import type { BackupContext, BackupDestination } from "../types/recovery.types";
import {
  backupObjectKey,
  independentObjectIndex,
  publishBackupObject,
  publishIndependentBackup,
} from "./independent-backup";
import {
  publishStorageBackup,
  storageBackupIndex,
  storageBackupObjectPath,
  uploadStorageBackup,
} from "./supabase-backup";

export function backupDestination(context: BackupContext): BackupDestination {
  return context.destination ?? (context.mode === "local" ? "local" : "s3");
}

export async function destinationObjectIndex(context: BackupContext) {
  const destination = backupDestination(context);
  if (destination === "local") return new Map<string, number>();
  if (destination === "supabase-storage") return storageBackupIndex(context);
  return independentObjectIndex(context.key);
}

export function destinationObjectPath(context: BackupContext, hash: string) {
  if (backupDestination(context) === "supabase-storage")
    return storageBackupObjectPath(context.key, hash);
  return backupObjectKey(context.key, hash);
}

export async function publishDestinationObject(
  context: BackupContext,
  file: string,
  hash: string,
) {
  const destination = backupDestination(context);
  if (destination === "local") return;
  if (destination === "supabase-storage")
    return uploadStorageBackup(
      context,
      file,
      destinationObjectPath(context, hash),
    );
  publishBackupObject(file, context.key, hash);
}

export async function publishDestinationBackup(
  context: BackupContext,
  directory: string,
  id: string,
) {
  const destination = backupDestination(context);
  if (destination === "local") return;
  if (destination === "supabase-storage")
    return publishStorageBackup(context, directory, id);
  publishIndependentBackup(directory, id);
}

import { z } from "zod";

import type {
  BackupIndexEntry,
  StoredBackupObject,
} from "../types/recovery.types";

const metadataSchema = z.object({ size: z.number().int().nonnegative() });

export function storageBackupEntries(
  objects: readonly StoredBackupObject[],
  prefix: string,
): BackupIndexEntry[] {
  return objects.flatMap((object): BackupIndexEntry[] => {
    if (!/^[a-f0-9]{64}\.enc$/.test(object.name)) return [];
    const metadata = metadataSchema.safeParse(object.metadata);
    if (!metadata.success) throw new Error("INTEGRITY_FAILED");
    return [[`${prefix}/${object.name}`, metadata.data.size]];
  });
}

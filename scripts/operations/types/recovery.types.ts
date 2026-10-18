import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

import type {
  Database,
  Json,
} from "../../../src/lib/supabase/types/database.types";
import type { recoveryManifestSchema } from "../contracts/recovery.schema";

export type BackupMode = "local" | "cloud";
export type RecoveryManifest = z.infer<typeof recoveryManifestSchema>;
export type BackupObject = RecoveryManifest["objects"][number];
export type BackupVersion = Pick<
  Database["public"]["Tables"]["document_versions"]["Row"],
  | "storage_bucket"
  | "storage_path"
  | "sha256"
  | "validated_bytes"
  | "validated_mime"
>;
export interface BackupContext {
  mode: BackupMode;
  key: string;
  client: SupabaseClient<Database>;
  directory: string;
  container?: string;
}
export type RecoveryProjectKind = "source" | "restore";
export interface RecoveryDatabase {
  container: string;
  url: string;
  secret: string;
}
export interface RecoveryFixtureCommand {
  client: SupabaseClient<Database>;
  organizationId: string;
  gateway: "h02_command" | "h03_command";
  operation: string;
  input: Json;
}
export interface RecoveryAccess {
  target: RecoveryDatabase;
  publicKey: string;
  admin: SupabaseClient<Database>;
  organizationId: string;
  companyId: string;
  versionId: string;
  bytes: Uint8Array;
}

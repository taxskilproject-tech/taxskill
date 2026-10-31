import { z } from "zod";

const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const backupObjectSchema = z.object({
  bucket: z.enum(["documents", "sunat-mailbox"]),
  path: z
    .string()
    .regex(/^[a-zA-Z0-9/_\-.]+$/)
    .refine(
      (value) => !value.split("/").some((part) => part === ".." || !part),
    ),
  file: z.string().regex(/^objects\/[a-f0-9]{64}\.enc$/),
  bytes: z.number().int().nonnegative(),
  mime: z.string().min(1).max(200),
  sha256: hashSchema,
});
export const recoveryManifestSchema = z.object({
  schema_version: z.literal(1),
  id: z.uuid(),
  created_at: z.iso.datetime(),
  source: z.enum(["local", "gzwrqvqofcrdjvzoblaz"]),
  backup_destination: z.enum(["local", "s3", "supabase-storage"]).optional(),
  database_sha256: hashSchema,
  migrations: z.array(z.string().regex(/^\d{14}$/)).min(57),
  objects: z.array(backupObjectSchema),
});

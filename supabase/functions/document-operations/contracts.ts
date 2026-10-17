import { z } from "zod";

export const bodySchema = z.object({
  action: z.enum(["prepare", "finalize", "download", "cleanup"]),
  intent_id: z.uuid().optional(), version_id: z.uuid().optional(), request_id: z.uuid().optional(),
  organization_id: z.uuid().optional(),
});
export const uploadContextSchema = z.object({
  intent: z.object({ id: z.uuid(), organization_id: z.uuid(), user_id: z.uuid(), deliverable_id: z.uuid(),
    reserved_version_id: z.uuid(), original_name: z.string(), declared_bytes: z.number(), state: z.string(),
    staging_bucket: z.string(), staging_path: z.string(), final_bucket: z.string(), final_path: z.string(),
    validation_token: z.uuid().nullable(), expires_at: z.string(), confirmed_version_id: z.uuid().nullable(),
  }), specs: z.object({ allowed_formats: z.array(z.string()), max_file_bytes: z.number() }),
});
export const claimSchema = z.object({ status: z.string(), version_id: z.uuid().optional(), intent: uploadContextSchema.shape.intent.optional(), specs: uploadContextSchema.shape.specs.optional() });
export const cleanupSchema = z.array(z.object({ id: z.uuid(), staging_bucket: z.string(), staging_path: z.string() }));

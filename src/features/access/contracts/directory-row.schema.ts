import { z } from "zod";

const metadataSchema = z.object({
  created_at: z.string(),
  created_by: z.uuid().nullable(),
  updated_at: z.string(),
  updated_by: z.uuid().nullable(),
  revision: z.number().int().nonnegative(),
  deleted_at: z.string().nullable(),
  deleted_by: z.uuid().nullable(),
  deletion_reason: z.string().nullable(),
});
export const profileRowSchema = metadataSchema.extend({
  user_id: z.uuid(),
  email: z.email(),
  full_name: z.string(),
  whatsapp_phone: z.string().nullable(),
  enabled: z.boolean(),
  provisioning_status: z.string(),
});
export const memberRowSchema = metadataSchema.extend({
  id: z.uuid(),
  organization_id: z.uuid(),
  user_id: z.uuid(),
  member_type: z.string(),
  is_admin: z.boolean(),
  active: z.boolean(),
});
export const userRowSchema = z.object({
  profile: profileRowSchema,
  member: memberRowSchema,
});

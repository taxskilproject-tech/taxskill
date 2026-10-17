import { z } from "zod";

import { documentRowSchema } from "@/domain/documents/contracts/document.schema";

export const metadataDocumentSchema = documentRowSchema.extend({
  worker_name: z.string(),
  worker_identity: z.string().nullable(),
  period: z.string(),
  document_type: z.string(),
  state: z.string(),
  record_status: z.enum(["active", "inactive", "deleted"]),
  is_current: z.boolean(),
});
export const metadataResultSchema = z.object({
  rows: z.array(metadataDocumentSchema),
  count: z.number().int(),
  queried_at: z.string(),
});
export const auditEventSchema = z.object({
  id: z.uuid(),
  actor_kind: z.enum(["user", "system"]),
  actor_user_id: z.uuid().nullable(),
  actor_name: z.string(),
  company_id: z.uuid().nullable(),
  company_name: z.string().nullable(),
  module: z.string().nullable(),
  action: z.string(),
  resource_table: z.string(),
  resource_id: z.uuid(),
  created_at: z.string(),
  before_values: z.record(z.string(), z.unknown()),
  after_values: z.record(z.string(), z.unknown()),
  metadata: z.record(z.string(), z.unknown()),
  record_status: z.string(),
});
export const auditResultSchema = z.object({
  rows: z.array(auditEventSchema),
  count: z.number().int(),
  queried_at: z.string(),
});

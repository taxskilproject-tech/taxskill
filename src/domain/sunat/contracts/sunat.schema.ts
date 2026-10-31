import { z } from "zod";

export const sunatMailboxSchema = z.enum(["notifications", "messages"]);
export const sunatConnectionSchema = z.object({
  id: z.uuid(),
  company_id: z.uuid(),
  state: z.enum([
    "pending_verification",
    "connected",
    "needs_attention",
    "disconnected",
  ]),
  revision: z.number().int(),
  credential_version: z.number().int(),
  daily_enabled: z.boolean(),
  daily_time: z.string(),
  last_verified_at: z.string().nullable(),
  last_success_at: z.string().nullable(),
  last_daily_success_at: z.string().nullable(),
  error_code: z.string().nullable(),
});
export const sunatJobSchema = z.object({
  id: z.uuid(),
  kind: z.enum(["verify", "monthly", "daily", "message", "attachment"]),
  state: z.enum([
    "queued",
    "running",
    "complete",
    "partial",
    "failed",
    "cancelled",
  ]),
  error_code: z.string().nullable(),
  created_at: z.string(),
  finished_at: z.string().nullable(),
  progress: z
    .object({
      pages: z.number().optional(),
      messages: z.number().optional(),
      mailbox: z.string().optional(),
    })
    .passthrough(),
  from_date: z.string().nullable(),
  through_date: z.string().nullable(),
});
export const sunatMonthSchema = z.object({
  mailbox: sunatMailboxSchema,
  state: z.enum(["complete", "partial", "failed"]),
  year: z.number(),
  month: z.number(),
  last_success_at: z.string().nullable(),
  last_attempt_at: z.string(),
  error_code: z.string().nullable(),
  message_count: z.number().nullable(),
});
export const sunatWorkspaceSchema = z.object({
  connection: sunatConnectionSchema.nullable(),
  company: z.object({ id: z.uuid(), ruc: z.string(), legal_name: z.string() }),
  jobs: z.array(sunatJobSchema),
  months: z.array(sunatMonthSchema),
  worker_ready: z.boolean(),
  worker_mode: z.string().nullable(),
  dispatcher_error_code: z.string().nullable().optional(),
  scheduler_enabled: z.boolean().optional(),
});
export const sunatMessageSchema = z.object({
  id: z.uuid(),
  mailbox: sunatMailboxSchema,
  source_id: z.string(),
  published_on: z.iso.date(),
  subject: z.string(),
  source_read: z.boolean(),
  has_attachments: z.boolean(),
  details_loaded_at: z.string().nullable(),
  content_text: z.string().nullable().optional(),
});
export const sunatAttachmentSchema = z.object({
  id: z.uuid(),
  filename: z.string(),
  state: z.enum(["available", "cached", "failed"]),
  byte_size: z.number().nullable(),
  mime_type: z.string().nullable(),
  error_code: z.string().nullable(),
});
export const sunatMessageListSchema = z.object({
  rows: z.array(sunatMessageSchema),
  count: z.number(),
});
export const sunatDetailSchema = z.object({
  message: sunatMessageSchema,
  attachments: z.array(sunatAttachmentSchema),
});
export const sunatCommandResultSchema = z.object({
  resource_id: z.uuid(),
  job_id: z.uuid().nullable(),
  revision: z.number().int(),
  state: z.enum(["complete", "queued"]),
});
export const sunatAccessSchema = z.object({
  is_admin: z.boolean(),
  rows: z.array(
    z.object({
      company_id: z.uuid(),
      legal_name: z.string(),
      ruc: z.string(),
      grant_id: z.uuid().nullable(),
      revision: z.number().int(),
      allowed: z.boolean(),
    }),
  ),
});
export const sunatAlertsSchema = z.object({
  count: z.number(),
  rows: z.array(
    z.object({
      id: z.uuid(),
      company_id: z.uuid(),
      message_id: z.uuid().nullable(),
      published_on: z.string().nullable(),
      title: z.string(),
      body: z.string(),
      created_at: z.string(),
      read_at: z.string().nullable(),
    }),
  ),
});
export const saveSunatCredentialsSchema = z.strictObject({
  organization_id: z.uuid(),
  company_id: z.uuid(),
  request_id: z.uuid(),
  expected_revision: z.number().int().min(-1),
  sol_username: z.string().trim().min(1).max(64),
  sol_password: z.string().min(1).max(128),
  consent: z.literal(true),
});
export const sunatDownloadSchema = z.strictObject({
  organization_id: z.uuid(),
  attachment_id: z.uuid(),
  request_id: z.uuid(),
});
export const sunatSignedFileSchema = z.object({
  url: z.url(),
  filename: z.string(),
});
export const sunatDispatchAcceptedSchema = z.strictObject({
  accepted: z.literal(true),
});

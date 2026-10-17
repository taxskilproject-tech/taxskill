import { z } from "zod";

export const notificationSchema = z.object({
  id: z.uuid(),
  event_id: z.uuid(),
  title: z.string(),
  body: z.string(),
  target_path: z.string(),
  read_at: z.string().nullable(),
  created_at: z.string(),
  revision: z.number(),
  event_type: z.string(),
  company_id: z.uuid().nullable(),
  obligation_id: z.uuid().nullable(),
});
export const notificationListSchema = z.object({
  rows: z.array(notificationSchema),
  count: z.number(),
  unread_count: z.number(),
});
export const notificationCountSchema = z.object({ unread_count: z.number() });
export const whatsappContactSchema = z.object({
  user_id: z.uuid(),
  expected_revision: z.number().int().nonnegative(),
  whatsapp_phone: z
    .string()
    .regex(
      /^\+[1-9]\d{7,14}$/,
      "Usa formato internacional, por ejemplo +51987654321.",
    )
    .nullable(),
});
export const digestStatusSchema = z.enum([
  "pending",
  "accepted",
  "sent",
  "delivered",
  "failed",
  "unknown",
]);
export const digestSchema = z.object({
  id: z.uuid(),
  delivery_id: z.uuid(),
  recipient_id: z.uuid(),
  recipient_name: z.string(),
  local_date: z.string(),
  status: digestStatusSchema,
  http_attempt_count: z.number(),
  last_attempt_at: z.string().nullable(),
  accepted_at: z.string().nullable(),
  sent_at: z.string().nullable(),
  delivered_at: z.string().nullable(),
  expired_at: z.string().nullable(),
  last_error_code: z.string().nullable(),
  provider_message_id: z.string().nullable(),
  revision: z.number(),
  has_receipt: z.boolean(),
  needs_provider_reconciliation: z.boolean(),
});
export const digestListSchema = z.object({
  rows: z.array(digestSchema),
  count: z.number(),
});
export const contactIssueListSchema = z.object({
  rows: z.array(
    z.object({
      user_id: z.uuid(),
      full_name: z.string(),
      reason: z.enum(["missing", "invalid"]),
    }),
  ),
  count: z.number(),
});
export const attemptListSchema = z.object({
  rows: z.array(
    z.object({
      id: z.uuid(),
      direction: z.string(),
      attempt_number: z.number(),
      http_status: z.number().nullable(),
      provider_status: z.string().nullable(),
      error_code: z.string().nullable(),
      created_at: z.string(),
      result: z.object({
        phase: z.string().optional(),
        transport_outcome: z.string().optional(),
        applied: z.boolean().optional(),
      }),
    }),
  ),
  count: z.number(),
});

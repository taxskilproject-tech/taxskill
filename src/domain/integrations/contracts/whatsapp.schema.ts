import { z } from "zod";

const civilDate = z.iso.date();
const instant = z.iso.datetime({ offset: true });
export const digestItemSchema = z
  .object({
    obligation_id: z.uuid(),
    notification_event_id: z.uuid().nullable(),
    category: z.enum(["due_soon", "overdue", "observed"]),
    title: z.string().min(1).max(150),
    company: z.string().nullable(),
    module: z.enum([
      "tributario",
      "laboral_general",
      "laboral_trabajador",
      "actividades",
    ]),
    due_date: civilDate,
    priority: z.enum(["alta", "media", "baja"]),
    url: z.url().refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        /^\/actividades\/[0-9a-f-]{36}$/.test(url.pathname) &&
        url.origin + url.pathname === value
      );
    }, "Usa un enlace HTTPS canónico al detalle."),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.category === "observed" && !value.notification_event_id)
      context.addIssue({
        code: "custom",
        message: "Una observación requiere su evento.",
      });
  });
export const externalDigestSchema = z
  .object({
    delivery_id: z.uuid(),
    recipient_id: z.uuid(),
    local_date: civilDate,
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
    items: z.array(digestItemSchema).min(1),
  })
  .strict();
export const whatsappBatchSchema = z
  .object({
    schema_version: z.literal("1.0"),
    batch_id: z.uuid(),
    event_type: z.literal("whatsapp.digest.batch"),
    generated_at: instant,
    timezone: z.literal("America/Lima"),
    digests: z.array(externalDigestSchema).min(1).max(50),
  })
  .strict();
export const whatsappReceiptSchema = z
  .object({
    schema_version: z.literal("1.0"),
    receipt_id: z.uuid(),
    delivery_id: z.uuid(),
    status: z.enum(["sent", "delivered", "failed", "unknown"]),
    occurred_at: instant,
    provider_message_id: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .nullable()
      .optional(),
    error_code: z
      .string()
      .regex(/^[A-Z0-9_]{1,80}$/)
      .nullable()
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      ["sent", "delivered"].includes(value.status) &&
      !value.provider_message_id
    )
      context.addIssue({
        code: "custom",
        message: "La confirmación requiere identificador del proveedor.",
      });
  });
export const receiptResultSchema = z.object({
  delivery_id: z.uuid(),
  status: z.enum([
    "pending",
    "accepted",
    "sent",
    "delivered",
    "failed",
    "unknown",
  ]),
  duplicate: z.boolean(),
});
export const dispatchClaimSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("idle") }),
  z.object({
    status: z.literal("ready"),
    lease_id: z.uuid(),
    batch: whatsappBatchSchema,
  }),
]);
export const dispatchAttemptSchema = z.object({
  attempt_id: z.uuid(),
  attempt_number: z.number().int().min(1).max(3),
});

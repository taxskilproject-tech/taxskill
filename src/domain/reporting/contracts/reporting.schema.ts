import { z } from "zod";

export const reportFiltersSchema = z
  .object({
    indicator: z.enum(["review", "overdue", "upcoming", "observed"]).optional(),
    company_id: z.uuid().optional(),
    scope: z.enum(["all", "company", "internal"]).default("all"),
    module: z
      .enum([
        "tributario",
        "laboral_trabajador",
        "laboral_general",
        "actividades",
      ])
      .optional(),
    class: z.enum(["documentary", "additional"]).optional(),
    state: z
      .enum([
        "pendiente",
        "por_revisar",
        "observado",
        "aprobado",
        "no_aplica",
        "cancelled",
      ])
      .optional(),
    q: z.string().max(200).optional(),
    period: z.string().max(100).optional(),
    year: z.coerce.number().int().min(1900).max(9999).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    worker_id: z.uuid().optional(),
    document_type_id: z.uuid().optional(),
    due_from: z.iso.date().optional(),
    due_to: z.iso.date().optional(),
    include_deleted: z.boolean().default(false),
    report: z
      .enum([
        "detail",
        "compliance",
        "pending",
        "deadlines",
        "observed",
        "period",
      ])
      .default("detail"),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce
      .number()
      .pipe(
        z.union([z.literal(25), z.literal(50), z.literal(100), z.literal(500)]),
      )
      .default(25),
    sort: z.enum(["due", "title", "period"]).default("due"),
    actor_id: z.uuid().optional(),
    resource: z.string().max(100).optional(),
    action: z.string().max(100).optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .strict()
  .refine(
    (f) => !f.due_from || !f.due_to || f.due_from <= f.due_to,
    "Rango de vencimiento inválido.",
  )
  .refine(
    (f) => !f.from || !f.to || f.from <= f.to,
    "Rango de auditoría inválido.",
  );

export const reportRowSchema = z.object({
  id: z.uuid(),
  company_id: z.uuid().nullable(),
  company_name: z.string(),
  ruc: z.string().nullable(),
  module: z.string(),
  class: z.enum(["documentary", "additional"]),
  title: z.string(),
  period: z.string(),
  period_start: z.iso.date(),
  period_end: z.iso.date(),
  worker_id: z.uuid().nullable(),
  worker_name: z.string(),
  worker_identity: z.string().nullable(),
  document_type_id: z.uuid().nullable(),
  document_type: z.string(),
  state: z.string(),
  initial_due_date: z.iso.date(),
  operational_due_date: z.iso.date().nullable(),
  approved_count: z.number().int(),
  total_count: z.number().int(),
  observed_count: z.number().int(),
  review_files: z.number().int(),
  required: z.boolean(),
  approved: z.boolean(),
  is_required: z.boolean(),
  disposition: z.string(),
  overdue: z.boolean(),
  late_cycles: z.number().int(),
  submitted_cycles: z.number().int(),
  last_submitted_at: z.string().nullable(),
  record_status: z.enum(["active", "inactive", "deleted"]),
  revision: z.number().int(),
});
export const reportMetricsSchema = z.object({
  companies: z.number().int(),
  required: z.number().int(),
  approved: z.number().int(),
  additional_required: z.number().int(),
  additional_approved: z.number().int(),
  pending: z.number().int(),
  review_files: z.number().int(),
  observed_files: z.number().int(),
  overdue: z.number().int(),
  upcoming: z.number().int(),
});
export const reportGroupSchema = z.object({
  company_id: z.uuid().nullable(),
  company_name: z.string(),
  module: z.string(),
  class: z.string(),
  required: z.number().int(),
  approved: z.number().int(),
});
export const reportResultSchema = z.object({
  rows: z.array(reportRowSchema),
  count: z.number().int(),
  fingerprint: z.string(),
  queried_at: z.string(),
  metrics: reportMetricsSchema,
  groups: z.array(reportGroupSchema),
});
export const exportReceiptSchema = z.object({
  filters: z.record(z.string(), z.unknown()),
  format: z.enum(["xlsx", "pdf"]),
  count: z.number().int(),
  fingerprint: z.string(),
  outcome: z.enum(["started", "generated", "cancelled", "failed"]),
});

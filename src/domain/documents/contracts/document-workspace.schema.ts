import { z } from "zod";

import { summarySchema } from "@/domain/documents/contracts/document.schema";

export const documentPeriodGroupSchema = z.object({
  setup_state: z
    .enum(["pending_responsible", "scheduled", "paused", "active"])
    .optional(),
  starts_on: z.string().nullable().optional(),
  code: z.string(),
  name: z.string(),
  count: z.number(),
  total_files: z.number(),
  approved_files: z.number(),
});
export const documentPeriodFileSchema = z.object({
  id: z.uuid(),
  label: z.string(),
  display_order: z.number(),
  review_state: z.enum(["pendiente", "por_revisar", "observado", "aprobado"]),
  due_date: z.string().nullable(),
  formats: z.array(z.string()),
});
export const documentPeriodObligationSchema = summarySchema.extend({
  document_code: z.string(),
  document_name: z.string(),
  period_kind: z.string(),
  period_start: z.string(),
  period_end: z.string(),
  files: z.array(documentPeriodFileSchema),
});
export const documentPeriodWorkspaceSchema = z.object({
  years: z.array(z.number()),
  months: z.array(z.object({ month: z.number(), count: z.number() })),
  groups: z.array(documentPeriodGroupSchema),
  selected_code: z.string().nullable(),
  rows: z.array(documentPeriodObligationSchema),
  count: z.number(),
});

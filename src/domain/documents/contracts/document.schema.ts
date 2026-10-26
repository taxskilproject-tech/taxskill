import { z } from "zod";

import { FILE_FORMATS } from "@/domain/documents/constants/documents";
import { DOCUMENT_MODULES } from "@/domain/documents/constants/engine";
import {
  engineVersionSchema,
  generationCursorSchema,
  operationPauseSchema,
} from "@/domain/documents/contracts/engine.schema";
import { slotSpecSchema } from "@/domain/documents/contracts/slot.schema";

export { slotSpecSchema };

export const documentTypeInputSchema = z.object({
  id: z.uuid().optional(),
  expected_revision: z.number().int().nonnegative().optional(),
  code: z.string().trim().min(2).max(60),
  name: z.string().trim().min(2).max(150),
  module: z.enum(DOCUMENT_MODULES),
  category: z.string().trim().max(100).nullable().optional(),
  description: z.string().max(1000).nullable(),
  suggested_formats: z.array(z.enum(FILE_FORMATS)).min(1),
  active: z.boolean(),
});
export { engineRequirementSchema as requirementInputSchema } from "@/domain/documents/contracts/engine.schema";
export const summarySchema = z.object({
  class: z.enum(["documentary", "additional"]).optional(),
  employment_period_id: z.uuid().nullable().optional(),
  worker_id: z.uuid().nullable().optional(),
  worker_name: z.string().nullable().optional(),
  employment_sequence: z.number().nullable().optional(),
  employment_stage: z.string().optional(),
  id: z.uuid(),
  organization_id: z.uuid(),
  company_id: z.uuid().nullable(),
  module: z.enum([
    "tributario",
    "laboral_trabajador",
    "laboral_general",
    "actividades",
  ]),
  title: z.string(),
  description: z.string().nullable(),
  company_name: z.string().nullable(),
  occurrence_key: z.string(),
  initial_due_date: z.string(),
  operational_due_date: z.string().nullable(),
  delivery_responsible_id: z.uuid().nullable(),
  assignment_issue: z.boolean(),
  priority: z.enum(["alta", "media", "baja"]),
  is_required: z.boolean(),
  disposition: z.enum(["active", "no_aplica", "cancelled"]),
  disposition_reason: z.string().nullable(),
  aggregate_state: z.enum([
    "pendiente",
    "por_revisar",
    "observado",
    "aprobado",
    "no_aplica",
    "cancelled",
  ]),
  approved_count: z.number(),
  total_count: z.number(),
  observed_count: z.number(),
  pending_count: z.number(),
  overdue: z.boolean(),
  revision: z.number(),
});
export const deliverableSchema = z.object({
  id: z.uuid(),
  obligation_id: z.uuid(),
  position_code: z.string(),
  label: z.string(),
  display_order: z.number(),
  current_version_id: z.uuid().nullable(),
  review_state: z.enum(["pendiente", "por_revisar", "observado", "aprobado"]),
  revision: z.number(),
});
export const cycleSchema = z.object({
  id: z.uuid(),
  deliverable_id: z.uuid(),
  cycle_number: z.number(),
  reason: z.string(),
  due_date: z.string(),
  state: z.enum(["open", "submitted", "closed", "cancelled"]),
  first_submitted_at: z.string().nullable(),
});
export const intentSchema = z.object({
  id: z.uuid(),
  deliverable_id: z.uuid(),
  cycle_id: z.uuid(),
  original_name: z.string(),
  declared_bytes: z.number(),
  expected_deliverable_revision: z.number(),
  state: z.string(),
  expires_at: z.string(),
  error_code: z.string().nullable(),
  confirmed_version_id: z.uuid().nullable(),
});
export const snapshotSchema = z.object({
  schema_version: z.literal(1),
  deliverables: z.array(slotSpecSchema),
  max_file_bytes: z.number(),
  allowed_formats: z.array(z.string()),
});
export const detailSchema = z.object({
  obligation: z.object({ id: z.uuid(), snapshot: snapshotSchema }),
  summary: summarySchema,
  deliverables: z.array(deliverableSchema),
  cycles: z.array(cycleSchema),
  intents: z.array(intentSchema),
});
export const reviewSchema = z.object({
  id: z.uuid(),
  decision: z.enum(["approve", "observe", "reopen"]),
  comment: z.string().nullable(),
  new_due_date: z.string().nullable(),
  created_at: z.string(),
  reviewer_name: z.string().nullable(),
});
export const versionSchema = z.object({
  id: z.uuid(),
  deliverable_id: z.uuid(),
  original_name: z.string(),
  version_number: z.number(),
  validated_bytes: z.number(),
  extension: z.string(),
  finalized_at: z.string(),
  uploader_name: z.string().nullable(),
  label: z.string(),
  cycle: cycleSchema,
  reviews: z.array(reviewSchema),
});
export const catalogRowSchema = documentTypeInputSchema
  .omit({ id: true, expected_revision: true, module: true })
  .extend({
    usage: z
      .object({
        count: z.number(),
        active_companies: z.number(),
        pending_companies: z.number(),
        paused_companies: z.number(),
      })
      .optional(),
    id: z.uuid(),
    module: z.enum(DOCUMENT_MODULES),
    revision: z.number(),
    deleted_at: z.string().nullable(),
    deletion_reason: z.string().nullable(),
  });
export const ruleRowSchema = z.object({
  preparation_pending: z.boolean().optional(),
  presentation_order: z.number().nullable().optional(),
  id: z.uuid(),
  title: z.string(),
  company_id: z.uuid(),
  company_name: z.string(),
  document_type_id: z.uuid(),
  active: z.boolean(),
  deleted_at: z.string().nullable(),
  revision: z.number(),
  module: z.enum(DOCUMENT_MODULES),
  description: z.string().nullable(),
  inherit_responsible: z.boolean(),
  delivery_responsible_id: z.uuid().nullable(),
  employment_period_id: z.uuid().nullable(),
  configuration: engineVersionSchema,
  effective_configuration: engineVersionSchema.nullable(),
  generation_cursor: generationCursorSchema,
  operation_pauses: z.array(operationPauseSchema),
});
export const documentRowSchema = z.object({
  id: z.uuid(),
  obligation_id: z.uuid(),
  original_name: z.string(),
  extension: z.string(),
  validated_bytes: z.number(),
  finalized_at: z.string(),
  version_number: z.number(),
  title: z.string(),
  company_id: z.uuid().nullable(),
  company_name: z.string().nullable(),
  module: z.enum([
    "tributario",
    "laboral_trabajador",
    "laboral_general",
    "actividades",
  ]),
});
export const documentResultSchema = z.object({
  schema_version: z.literal(1),
  resource_id: z.uuid(),
  revision: z.number().int(),
  status: z.string(),
  upload_intent_id: z.uuid().optional(),
  version_id: z.uuid().optional(),
  obligation_id: z.uuid().nullable().optional(),
  generated_count: z.number().optional(),
  processed_count: z.number().optional(),
  has_more: z.boolean().optional(),
  warning: z.string().nullable().optional(),
  effective_from: z.string().optional(),
});
export const signedUploadSchema = z.object({
  token: z.string(),
  bucket: z.string(),
  path: z.string(),
});
export const signedDownloadSchema = z.object({
  url: z.url(),
  expires_in: z.number(),
  original_name: z.string(),
  extension: z.string(),
});
export const finalizationSchema = z.object({
  status: z.enum(["ready", "processing"]),
  version_id: z.uuid().optional(),
});

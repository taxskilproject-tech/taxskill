import { z } from "zod";

import { FILE_FORMATS } from "@/domain/documents/constants/documents";
import {
  DOCUMENT_MODULES,
  FREQUENCIES,
  MAX_CONFIGURED_FILE_BYTES,
  MAX_DELIVERABLES,
} from "@/domain/documents/constants/engine";
import { slotSpecSchema } from "@/domain/documents/contracts/slot.schema";
import { validateRequirement } from "@/domain/documents/utils/validate-requirement";
import { parseCivilDate } from "@/domain/time/utils/civil-date";

export const civilDateSchema = z
  .string()
  .refine(
    (value) => parseCivilDate(value).ok,
    "Introduce una fecha civil válida.",
  );
export const applicabilitySchema = z
  .object({
    schema_version: z.literal(1),
    employment_stage: z.enum(["any", "ingreso", "relacion", "cese"]),
    event_types: z.array(
      z.enum(["worker_hired", "worker_terminated", "manual_request"]),
    ),
    termination_reasons: z.array(
      z.enum(["renuncia", "despido", "fin_contrato", "mutuo_acuerdo", "otro"]),
    ),
  })
  .strict();
export const engineVersionSchema = z.object({
  id: z.uuid(),
  version_number: z.number().int().positive(),
  effective_from: civilDateSchema,
  frequency: z.enum(FREQUENCIES),
  interval_count: z.number().int().positive().nullable(),
  interval_unit: z.enum(["days", "weeks", "months"]).nullable(),
  anchor_date: civilDateSchema.nullable(),
  deadline_offset_days: z.number().int(),
  is_required: z.boolean(),
  priority: z.enum(["alta", "media", "baja"]),
  allowed_formats: z.array(z.enum(FILE_FORMATS)),
  max_file_bytes: z.number().int().positive(),
  deliverable_specs: z.array(slotSpecSchema),
  applicability_conditions: applicabilitySchema,
  configuration_snapshot: z.object({
    schema_version: z.literal(1),
    title: z.string(),
    description: z.string().nullable(),
    inherit_responsible: z.boolean(),
    delivery_responsible_id: z.uuid().nullable(),
  }),
});
export const generationCursorSchema = z.object({
  schema_version: z.literal(1),
  last_completed_occurrence: z.string().nullable(),
  processing_occurrence: z.string().nullable(),
  next_destination_key: z.string().nullable(),
  rule_version_id: z.uuid().nullable(),
  last_generated_at: z.string().nullable(),
  last_attempt_at: z.string().nullable().optional(),
  last_error: z.string().nullable().optional(),
  last_batch_count: z.number().optional(),
  has_more: z.boolean().optional(),
  warning: z.string().nullable().optional(),
});
export const operationPauseSchema = z.object({
  paused_from: civilDateSchema,
  resumed_on: civilDateSchema.nullable(),
  cause: z.string(),
  reason: z.string(),
  actor_id: z.uuid().nullable(),
});
export const engineRequirementFieldsSchema = z.object({
  id: z.uuid().optional(),
  expected_revision: z.number().int().nonnegative().optional(),
  company_id: z.uuid(),
  document_type_id: z.uuid(),
  employment_period_id: z.uuid().nullable().optional(),
  module: z.enum(DOCUMENT_MODULES).optional(),
  title: z.string().trim().min(2).max(150),
  description: z.string().max(1000).nullable(),
  frequency: z.enum(FREQUENCIES).default("mensual"),
  interval_count: z.number().int().min(1).max(1200).nullable().default(null),
  interval_unit: z.enum(["days", "weeks", "months"]).nullable().default(null),
  anchor_date: civilDateSchema.nullable().default(null),
  effective_from: civilDateSchema.nullable().optional(),
  deadline_offset_days: z.number().int().min(-366).max(366),
  priority: z.enum(["alta", "media", "baja"]),
  is_required: z.boolean(),
  active: z.boolean().default(false),
  inherit_responsible: z.boolean(),
  delivery_responsible_id: z.uuid().nullable(),
  max_file_bytes: z.number().int().min(1).max(MAX_CONFIGURED_FILE_BYTES),
  allowed_formats: z.array(z.enum(FILE_FORMATS)).min(1),
  deliverable_specs: z.array(slotSpecSchema).min(1).max(MAX_DELIVERABLES),
  applicability_conditions: applicabilitySchema.default({
    schema_version: 1,
    employment_stage: "any",
    event_types: [],
    termination_reasons: [],
  }),
});
export const engineRequirementSchema =
  engineRequirementFieldsSchema.superRefine(validateRequirement);
export const calendarPreviewSchema = z.object({
  kind: z.string(),
  key: z.string(),
  start_date: civilDateSchema,
  end_date: civilDateSchema,
  due_date: civilDateSchema,
  overdue: z.boolean(),
});
export const responsibleListSchema = z.object({
  rows: z.array(z.object({ user_id: z.uuid(), full_name: z.string() })),
  count: z.number(),
});

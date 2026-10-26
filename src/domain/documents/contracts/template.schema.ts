import { z } from "zod";

import {
  applicabilitySchema,
  civilDateSchema,
  engineRequirementFieldsSchema,
} from "@/domain/documents/contracts/engine.schema";

export const templateConfigurationSchema = engineRequirementFieldsSchema
  .pick({
    frequency: true,
    interval_count: true,
    interval_unit: true,
    anchor_date: true,
    deadline_offset_days: true,
    priority: true,
    is_required: true,
    max_file_bytes: true,
    allowed_formats: true,
    deliverable_specs: true,
  })
  .extend({
    frequency: engineRequirementFieldsSchema.shape.frequency.nullable(),
    deadline_offset_days: z.number().int().min(-366).max(366).nullable(),
  });
export const templateItemSchema = z.object({
  document_type_id: z.uuid(),
  code: z.string().min(1).max(60),
  name: z.string().min(1),
  module: z.enum(["tributario", "laboral_general", "laboral_trabajador"]),
  stage: applicabilitySchema.shape.employment_stage,
  condition: z.enum(["always", "plame", "afp", "sis", "essalud"]),
  included: z.boolean(),
  position: z.number().int().positive(),
  configuration: templateConfigurationSchema,
});
export const templateIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
});
export const templateVersionSchema = z.object({
  id: z.uuid(),
  revision: z.number().int(),
  version_number: z.number().int(),
  published_at: z.string().nullable(),
  items: z.array(templateItemSchema),
  issues: z.array(templateIssueSchema).default([]),
});
export const deliverableTemplateSchema = z.object({
  id: z.uuid(),
  regime_code: z.string(),
  published_version_id: z.uuid().nullable(),
  latest: templateVersionSchema,
  published: templateVersionSchema.nullable(),
});
export const deliverableTemplatesSchema = z.object({
  rows: z.array(deliverableTemplateSchema),
});
export const companyPreparationSchema = z.object({
  rows: z.array(
    z.object({
      id: z.uuid(),
      code: z.string(),
      name: z.string(),
      module: z.string(),
      condition: templateItemSchema.shape.condition,
      active: z.boolean(),
      pending: z.boolean(),
      from_template: z.boolean(),
      starts_on: civilDateSchema,
    }),
  ),
});
export const catalogUsageSchema = z.object({
  rows: z.array(
    z.object({
      company_id: z.uuid(),
      company_name: z.string(),
      ruc: z.string(),
      deleted_at: z.string().nullable(),
      active_count: z.number(),
      pending_count: z.number(),
      paused_count: z.number(),
    }),
  ),
  count: z.number(),
  active_companies: z.number(),
  pending_companies: z.number(),
  paused_companies: z.number(),
});

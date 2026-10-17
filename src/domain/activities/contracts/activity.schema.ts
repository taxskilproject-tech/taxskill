import { z } from "zod";

import { MODULE_IDS } from "@/domain/access/constants/access";
import {
  ACTIVITY_GROUPS,
  ACTIVITY_SORTS,
} from "@/domain/activities/constants/activities";
import { summarySchema } from "@/domain/documents/contracts/document.schema";
import {
  engineRequirementFieldsSchema,
  engineVersionSchema,
} from "@/domain/documents/contracts/engine.schema";
import { validateRequirement } from "@/domain/documents/utils/validate-requirement";
import { parseCivilDate } from "@/domain/time/utils/civil-date";

const dateFilter = z.string().refine((value) => parseCivilDate(value).ok);
export const activityFiltersSchema = z.object({
  group: z.enum(ACTIVITY_GROUPS).catch("mine"),
  sort: z.enum(ACTIVITY_SORTS).catch("urgency"),
  page: z.coerce.number().int().min(1).max(100000).catch(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(25), z.literal(50), z.literal(100)]))
    .catch(25),
  scope: z.enum(["all", "company", "internal"]).catch("all"),
  companyId: z.uuid().optional().catch(undefined),
  module: z.enum(MODULE_IDS).optional().catch(undefined),
  class: z.enum(["documentary", "additional"]).optional().catch(undefined),
  responsibleId: z.uuid().optional().catch(undefined),
  period: z.string().trim().max(150).optional().catch(undefined),
  priority: z.enum(["alta", "media", "baja"]).optional().catch(undefined),
  dueFrom: dateFilter.optional().catch(undefined),
  dueTo: dateFilter.optional().catch(undefined),
  state: z
    .enum([
      "pendiente",
      "por_revisar",
      "observado",
      "aprobado",
      "no_aplica",
      "cancelled",
    ])
    .optional()
    .catch(undefined),
  q: z.string().trim().max(150).optional().catch(undefined),
});
const countSchema = z.number().int().nonnegative();
export const activityListSchema = z.object({
  rows: z.array(summarySchema),
  count: countSchema,
  groups: z.object({
    mine: countSchema,
    review: countSchema,
    overdue: countSchema,
    upcoming: countSchema,
    observed: countSchema,
    all: countSchema,
  }),
  indicators: z.object({
    documentary: z.object({ required: countSchema, approved: countSchema }),
    additional: z.object({ required: countSchema, approved: countSchema }),
  }),
});
export const additionalInputSchema = engineRequirementFieldsSchema
  .extend({
    company_id: z.uuid().nullable(),
    document_type_id: z.null().default(null),
    module: z.literal("actividades").default("actividades"),
    delivery_responsible_id: z.uuid(),
    inherit_responsible: z.literal(false).default(false),
    due_date: dateFilter.nullable(),
  })
  .superRefine(validateRequirement)
  .superRefine((value, context) => {
    if (value.frequency === "eventual")
      context.addIssue({
        code: "custom",
        message:
          "Usa una fecha única o recurrencia de calendario para esta actividad.",
      });
  });
export const additionalRuleSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  company_id: z.uuid().nullable(),
  revision: countSchema,
  active: z.boolean(),
  deleted_at: z.string().nullable(),
  delivery_responsible_id: z.uuid().nullable(),
  configuration: engineVersionSchema,
});
export const additionalRulesSchema = z.object({
  rows: z.array(additionalRuleSchema),
  count: countSchema,
});
export const activityRecipientsSchema = z.object({
  rows: z.array(z.object({ user_id: z.uuid(), full_name: z.string() })),
  count: countSchema,
});

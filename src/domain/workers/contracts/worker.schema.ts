import { z } from "zod";

import { documentResultSchema } from "@/domain/documents/contracts/document.schema";
import { civilDateSchema } from "@/domain/documents/contracts/engine.schema";
import {
  IDENTITY_TYPES,
  MONEY_PATTERN,
  TERMINATION_REASONS,
} from "@/domain/workers/constants/workers";

export const workerInputSchema = z
  .object({
    company_id: z.uuid(),
    identity_type: z.enum(IDENTITY_TYPES),
    identity_number: z
      .string()
      .trim()
      .transform((value) => value.replace(/\s+/g, "").toUpperCase())
      .pipe(
        z
          .string()
          .min(1)
          .max(40)
          .regex(/^[A-Z0-9.-]+$/),
      ),
    first_names: z.string().trim().min(1).max(150),
    last_names: z.string().trim().min(1).max(150),
    birth_date: civilDateSchema.nullable(),
    email: z.email().max(254).nullable(),
    phone: z.string().max(40).nullable(),
    address: z.string().max(500).nullable(),
    notes: z.string().max(2000).nullable(),
  })
  .superRefine((value, context) => {
    if (
      value.identity_type === "DNI" &&
      !/^[0-9]{8}$/.test(value.identity_number)
    )
      context.addIssue({
        code: "custom",
        path: ["identity_number"],
        message: "El DNI debe tener ocho dígitos.",
      });
  });
export const employmentInputSchema = z
  .object({
    start_date: civilDateSchema,
    end_date: civilDateSchema.nullable(),
    termination_reason: z.enum(TERMINATION_REASONS).nullable(),
    termination_notes: z.string().max(1000).nullable(),
    position: z.string().max(150).nullable(),
    department: z.string().max(150).nullable(),
    contract_type: z.string().max(100).nullable(),
    reference_salary: z
      .string()
      .regex(
        MONEY_PATTERN,
        "Usa un importe no negativo, con máximo dos decimales y punto decimal.",
      )
      .nullable(),
    currency: z.string().regex(/^[A-Z]{3}$/),
  })
  .superRefine((value, context) => {
    if (value.end_date && value.end_date < value.start_date)
      context.addIssue({
        code: "custom",
        message: "El cese no puede preceder al ingreso.",
      });
    if (Boolean(value.end_date) !== Boolean(value.termination_reason))
      context.addIssue({
        code: "custom",
        message: "Fecha y motivo de cese deben informarse juntos.",
      });
    if (value.termination_reason === "otro" && !value.termination_notes?.trim())
      context.addIssue({
        code: "custom",
        message: "Describe el otro motivo de cese.",
      });
  });
export const generationPhaseSchema = z.object({
  event_id: z.uuid(),
  event_type: z.string().nullable(),
  occurred_on: civilDateSchema,
  reference_date: civilDateSchema,
  requested_at: z.string(),
  last_rule_id: z.uuid().nullable(),
  status: z.enum(["pending", "failed", "completed", "skipped"]),
  last_error: z.string().nullable(),
  generated_count: z.number(),
});
export const employmentRowSchema = z.object({
  id: z.uuid(),
  worker_id: z.uuid(),
  company_id: z.uuid(),
  sequence_number: z.number(),
  revision: z.number(),
  start_date: civilDateSchema,
  end_date: civilDateSchema.nullable(),
  termination_reason: z.enum(TERMINATION_REASONS).nullable(),
  termination_notes: z.string().nullable(),
  position: z.string().nullable(),
  department: z.string().nullable(),
  contract_type: z.string().nullable(),
  reference_salary: z.string().nullable(),
  currency: z.string(),
  document_generation: z.object({
    schema_version: z.literal(1),
    hire: generationPhaseSchema.nullable(),
    termination: generationPhaseSchema.nullable(),
    reconcile: generationPhaseSchema.nullable(),
  }),
});
export const workerRowSchema = z.object({
  id: z.uuid(),
  company_id: z.uuid(),
  identity_type: z.enum(IDENTITY_TYPES),
  identity_number: z.string(),
  first_names: z.string(),
  last_names: z.string(),
  birth_date: civilDateSchema.nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
  revision: z.number(),
  deleted_at: z.string().nullable(),
  deletion_reason: z.string().nullable(),
});
export const workerListSchema = z.object({
  rows: z.array(
    workerRowSchema
      .pick({
        id: true,
        company_id: true,
        identity_type: true,
        identity_number: true,
        first_names: true,
        last_names: true,
        revision: true,
        deleted_at: true,
        deletion_reason: true,
      })
      .extend({
        employment_status: z.enum(["active", "ended", "unregistered"]),
      }),
  ),
  count: z.number(),
});
export const workerDetailSchema = z.object({
  worker: workerRowSchema,
  company_name: z.string(),
  company_status: z.string(),
  has_open_period: z.boolean(),
  selected_period: employmentRowSchema.nullable(),
  period_rows: z.array(
    z.object({
      id: z.uuid(),
      sequence_number: z.number(),
      start_date: civilDateSchema,
      end_date: civilDateSchema.nullable(),
      revision: z.number(),
    }),
  ),
  period_count: z.number(),
});
export const workerResultSchema = documentResultSchema.extend({
  employment_period_id: z.uuid().optional(),
  generation: z
    .object({
      status: z.string(),
      generated_count: z.number(),
      error_code: z.string().optional(),
    })
    .optional(),
});
export const eventRulesSchema = z.object({
  rows: z.array(z.object({ id: z.uuid(), title: z.string() })),
  count: z.number(),
});

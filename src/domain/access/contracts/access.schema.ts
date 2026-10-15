import { z } from "zod";

import {
  ACTIONS,
  ADMIN_OPERATIONS,
  MODULE_IDS,
  MUTATION_OPERATIONS,
  SOFT_DELETE_ENTITIES,
} from "@/domain/access/constants/access";
import { parseCivilDate } from "@/domain/time/utils/civil-date";

const optionalText = z
  .string()
  .trim()
  .max(300)
  .transform((value) => value || null)
  .nullable()
  .optional();
export const revisionSchema = z.object({
  id: z.uuid().optional(),
  expected_revision: z.number().int().nonnegative().optional(),
});
export const companySchema = revisionSchema.extend({
  ruc: z.string().regex(/^\d{11}$/, "El RUC debe tener 11 dígitos."),
  legal_name: z.string().trim().min(2, "Ingresa la razón social.").max(200),
  trade_name: optionalText,
  address: optionalText,
  contact_email: z
    .union([z.email(), z.literal("")])
    .transform((value) => value || null)
    .nullable()
    .optional(),
  contact_phone: optionalText,
  legal_representative: optionalText,
  tax_regime: optionalText,
  status: z.enum(["active", "inactive", "suspended"]),
  accountant_id: z.uuid().nullable().optional(),
  supervisor_id: z.uuid().nullable().optional(),
  control_start_date: z
    .string()
    .refine((value) => parseCivilDate(value).ok, "Fecha civil inválida."),
});
export const overrideSchema = z.object({
  permission_id: z.uuid(),
  allowed: z.boolean(),
});
export const grantBaseSchema = revisionSchema.extend({
  member_id: z.uuid(),
  scope: z.enum(["company", "organization"]),
  company_id: z.uuid().nullable(),
  module: z.enum(MODULE_IDS),
  role_id: z.uuid(),
  active: z.boolean(),
  overrides: z.array(overrideSchema).max(11),
});
export const grantSchema = grantBaseSchema.superRefine((value, context) => {
  if (
    (value.scope === "company" && !value.company_id) ||
    (value.scope === "organization" &&
      (value.company_id || value.module !== "actividades"))
  ) {
    context.addIssue({
      code: "custom",
      message: "Selecciona empresa o Actividades internas.",
      path: ["scope"],
    });
  }
});
export const createUserSchema = z
  .object({
    email: z.email().transform((value) => value.trim().toLowerCase()),
    full_name: z.string().trim().min(2).max(150),
    password: z.string().min(12, "Usa al menos 12 caracteres.").max(128),
    whatsapp_phone: z
      .union([z.string().regex(/^\+[1-9]\d{7,14}$/), z.literal("")])
      .optional(),
    member_type: z.enum(["internal", "client"]),
    is_admin: z.boolean(),
    grants: z.array(grantBaseSchema.omit({ member_id: true })).max(120),
  })
  .refine(
    (value) => !value.is_admin || value.member_type === "internal",
    "Un cliente no puede administrar.",
  );
export const passwordSchema = z.object({
  password: z.string().min(12).max(128),
  expected_revision: z.number().int().nonnegative(),
});
export const enabledSchema = z.object({
  enabled: z.boolean(),
  expected_revision: z.number().int().nonnegative(),
});
export const roleSchema = revisionSchema.extend({
  code: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/)
    .max(60),
  name: z.string().trim().min(2).max(100),
  description: optionalText,
  audience: z.enum(["internal", "client"]),
  active: z.boolean(),
  permission_ids: z.array(z.uuid()).max(41),
});
export const lifecycleSchema = z.object({
  entity: z.enum(SOFT_DELETE_ENTITIES),
  id: z.uuid(),
  expected_revision: z.number().int().nonnegative(),
  reason: z.string().trim().min(1).max(500).optional(),
});
export const membershipSchema = revisionSchema.required().extend({
  member_type: z.enum(["internal", "client"]),
  is_admin: z.boolean(),
  active: z.boolean(),
});
export const moduleSettingsSchema = revisionSchema.extend({
  company_id: z.uuid(),
  module: z.enum(MODULE_IDS),
  delivery_responsible_id: z.uuid(),
});
export const organizationSettingsSchema = z.object({
  schema_version: z.literal(1),
  upcoming_days: z.number().int().min(1).max(365),
  digest_local_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  generation_local_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  default_max_file_bytes: z.number().int().min(1).max(50000000),
  allowed_formats: z
    .array(z.enum(["pdf", "xls", "xlsx", "doc", "docx", "jpg", "jpeg", "png"]))
    .min(1)
    .refine((values) => new Set(values).size === values.length),
  compliance_thresholds: z
    .object({
      green: z.number().int().min(1).max(100),
      yellow: z.number().int().min(0).max(99),
    })
    .refine((value) => value.yellow < value.green),
});
export const organizationSchema = revisionSchema.required().extend({
  name: z.string().trim().min(2).max(150),
  settings: organizationSettingsSchema,
});
export const commandEnvelopeSchema = z.object({
  organization_id: z.uuid(),
  request_id: z.uuid(),
  operation: z.enum(MUTATION_OPERATIONS),
  input: z.record(z.string(), z.unknown()),
});
export const adminEnvelopeSchema = z.object({
  organization_id: z.uuid(),
  request_id: z.uuid(),
  operation: z.enum(ADMIN_OPERATIONS),
  input: z.record(z.string(), z.unknown()),
  user_id: z.uuid().optional(),
});
export const capabilitySchema = z.object({
  company_id: z.uuid().nullable(),
  module: z.enum(MODULE_IDS),
  action: z.enum(ACTIONS),
});
export const commandResultSchema = z.object({
  schema_version: z.literal(1),
  resource_id: z.uuid(),
  revision: z.number().int().nonnegative(),
  status: z.literal("completed"),
  user_id: z.uuid().optional(),
});

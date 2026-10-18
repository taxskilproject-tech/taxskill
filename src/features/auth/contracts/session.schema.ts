import { z } from "zod";

import {
  capabilitySchema,
  organizationSettingsSchema,
} from "@/domain/access/contracts/access.schema";

export const sessionContextSchema = z.object({
  session_id: z.uuid(),
  profile: z.object({
    user_id: z.uuid(),
    full_name: z.string(),
    email: z.email(),
    enabled: z.boolean(),
    revision: z.number().int(),
  }),
  member: z.object({
    id: z.uuid(),
    organization_id: z.uuid(),
    user_id: z.uuid(),
    member_type: z.enum(["internal", "client"]),
    is_admin: z.boolean(),
  }),
  organization: z.object({
    id: z.uuid(),
    name: z.string(),
    status: z.string(),
    deleted_at: z.string().nullable(),
    revision: z.number().int(),
    settings: organizationSettingsSchema,
  }),
  companies: z.array(
    z.object({
      id: z.uuid(),
      legal_name: z.string(),
      ruc: z.string(),
      status: z.string(),
    }),
  ),
  capabilities: z.array(capabilitySchema),
});
export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

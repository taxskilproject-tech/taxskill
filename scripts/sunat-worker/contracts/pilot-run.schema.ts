import { z } from "zod";

import {
  sunatCredentialScopeSchema,
  sunatEncryptedSchema,
} from "../../../src/domain/sunat/contracts/credentials.schema";

export const pilotMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const pilotRunInputSchema = z.strictObject({
  authorized: z.literal(true),
  allow_source_inspection: z.boolean().default(false),
  scope: sunatCredentialScopeSchema,
  encrypted: sunatEncryptedSchema,
  pilot_reference: z
    .string()
    .regex(/^pilot-[1-9]\d*$/)
    .default("pilot-2"),
  months: z
    .array(pilotMonthSchema)
    .length(2)
    .refine((months) => new Set(months).size === months.length)
    .default(["2026-10", "2026-09"]),
});

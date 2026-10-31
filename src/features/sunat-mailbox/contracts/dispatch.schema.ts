import { z } from "zod";

import { claimedJobSchema } from "@/domain/sunat/contracts/worker.schema";

export const sunatDispatchEnvelopeSchema = z.strictObject({
  schema_version: z.literal(1),
  action: z.literal("sunat.dispatch"),
  nonce: z.uuid().toLowerCase(),
  issued_at: z.number().int().positive().safe(),
});

export const sunatDispatchRequestSchema = z.strictObject({
  organization_id: z.uuid(),
  job_id: z.uuid(),
});
export const sunatDispatchTicketSchema = z.object({
  run_id: z.uuid(),
  claim: claimedJobSchema,
});
export const sunatDispatcherEnvironmentSchema = z.object({
  SUNAT_EXECUTION_MODE: z.literal("vercel"),
  SUNAT_SOURCE_VALIDATED: z.literal("true"),
  SUNAT_SANDBOX_IMAGE: z
    .string()
    .regex(/^taxskill-sunat-worker@sha256:[a-f0-9]{64}$/),
  SUNAT_CREDENTIALS_CURRENT_KEY: z.string().min(1),
  SUNAT_CREDENTIALS_KEYS: z.string().min(1),
});

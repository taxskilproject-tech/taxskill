import { z } from "zod";

import { sunatEncryptedSchema } from "./credentials.schema";
import { sunatJobSchema } from "./sunat.schema";

export const workerTerminalStateSchema = sunatJobSchema.shape.state.exclude([
  "queued",
  "running",
]);

export const claimedJobSchema = z.object({
  job: z.object({
    id: z.uuid(),
    organization_id: z.uuid(),
    company_id: z.uuid(),
    connection_id: z.uuid(),
    credential_version: z.number(),
    lease_token: z.uuid(),
    kind: z.enum(["verify", "monthly", "daily", "message", "attachment"]),
    from_date: z.iso.date().nullable(),
    through_date: z.iso.date().nullable(),
    checkpoint: z.record(z.string(), z.unknown()),
  }),
  connection: z.object({
    consented_at: z.string(),
    consent_version: z.literal(1),
  }),
  company: z.object({ id: z.uuid(), ruc: z.string().regex(/^\d{11}$/) }),
  encrypted: sunatEncryptedSchema,
  message: z
    .object({
      id: z.uuid(),
      source_id: z.string(),
      mailbox: z.enum(["notifications", "messages"]),
    })
    .nullable(),
  attachment: z
    .object({
      id: z.uuid(),
      locator: z.string(),
      filename: z.string(),
      message_id: z.uuid(),
    })
    .nullable(),
});

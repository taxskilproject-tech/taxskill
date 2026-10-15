import { z } from "zod";

export const adminEntrySchema = z.object({
  id: z.uuid(),
  status: z.string(),
  external_identity_id: z.uuid(),
  result: z.unknown().nullable(),
});

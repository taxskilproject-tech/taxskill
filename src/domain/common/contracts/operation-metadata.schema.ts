import { z } from "zod";

export const operationMetadataSchema = z.object({
  request_id: z.uuid(),
  expected_revision: z.number().int().nonnegative().optional(),
});

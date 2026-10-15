import { z } from "zod";

export const operationStatusSchema = z.array(
  z.object({
    request_id: z.uuid(),
    operation: z.string(),
    status: z.string(),
    error_code: z.string().nullable(),
    resource_id: z.uuid().nullable(),
    updated_at: z.string(),
  }),
);

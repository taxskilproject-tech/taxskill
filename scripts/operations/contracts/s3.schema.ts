import { z } from "zod";

export const s3IndexSchema = z.object({
  Contents: z
    .array(z.object({ Key: z.string(), Size: z.number().int().nonnegative() }))
    .optional(),
});

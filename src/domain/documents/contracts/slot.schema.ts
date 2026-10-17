import { z } from "zod";

import { FILE_FORMATS } from "@/domain/documents/constants/documents";

export const slotSpecSchema = z.object({
  position_code: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(120),
  display_order: z.number().int().positive(),
  allowed_formats: z.array(z.enum(FILE_FORMATS)).min(1),
  max_file_bytes: z.number().int().positive(),
});

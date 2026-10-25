import type { z } from "zod";

import type { metadataDocumentSchema } from "@/domain/reporting/contracts/consultation.schema";

export interface MetadataRowProps {
  document: z.infer<typeof metadataDocumentSchema>;
  origin: string;
}

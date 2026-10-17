import type { z } from "zod";

import type { documentTypeInputSchema } from "@/domain/documents/contracts/document.schema";

export type CatalogTemplate = z.infer<typeof documentTypeInputSchema>;

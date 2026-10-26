import type { z } from "zod";

import type {
  documentPeriodFileSchema,
  documentPeriodGroupSchema,
  documentPeriodObligationSchema,
  documentPeriodWorkspaceSchema,
} from "@/domain/documents/contracts/document-workspace.schema";

export type DocumentPeriodFile = z.infer<typeof documentPeriodFileSchema>;
export type DocumentPeriodGroup = z.infer<typeof documentPeriodGroupSchema>;
export type DocumentPeriodObligation = z.infer<
  typeof documentPeriodObligationSchema
>;
export type DocumentPeriodWorkspaceData = z.infer<
  typeof documentPeriodWorkspaceSchema
>;

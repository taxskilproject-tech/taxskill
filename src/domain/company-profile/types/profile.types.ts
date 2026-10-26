import type { z } from "zod";

import type {
  documentaryProfileSchema,
  taxRegimeSchema,
} from "@/domain/company-profile/contracts/profile.schema";

export type TaxRegime = z.infer<typeof taxRegimeSchema>;
export type DocumentaryProfile = z.infer<typeof documentaryProfileSchema>;
export type ApplicabilityKey = "always" | "plame" | "afp" | "sis" | "essalud";
export interface ChecklistSelection {
  schema_version: 1;
  plame: boolean;
  afp: boolean;
  igv_renta: boolean;
  health_coverage: DocumentaryProfile["health_coverage"] | "";
}

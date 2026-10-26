import { z } from "zod";

import { companySchema } from "@/domain/access/contracts/access.schema";
import {
  documentaryProfileSchema,
  taxRegimeSchema,
} from "@/domain/company-profile/contracts/profile.schema";

export const companySetupSchema = companySchema.extend({
  tax_regime_code: taxRegimeSchema,
  documentary_profile: documentaryProfileSchema,
  document_template_version_id: z.uuid(
    "Publica y confirma la plantilla del régimen antes de crear la empresa.",
  ),
  confirm_document_changes: z.boolean().optional(),
});

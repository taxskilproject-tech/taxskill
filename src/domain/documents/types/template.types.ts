import type { z } from "zod";

import type {
  catalogUsageSchema,
  companyPreparationSchema,
  deliverableTemplateSchema,
  templateConfigurationSchema,
  templateItemSchema,
  templateVersionSchema,
} from "@/domain/documents/contracts/template.schema";

export type TemplateItem = z.infer<typeof templateItemSchema>;
export type TemplateConfiguration = z.infer<typeof templateConfigurationSchema>;
export type TemplateVersion = z.infer<typeof templateVersionSchema>;
export type DeliverableTemplate = z.infer<typeof deliverableTemplateSchema>;
export type CompanyPreparation = z.infer<typeof companyPreparationSchema>;
export type CatalogUsage = z.infer<typeof catalogUsageSchema>;

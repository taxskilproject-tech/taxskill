import type { z } from "zod";

import type {
  companyIndicatorSchema,
  deliveryDetailSchema,
  deliveryDetailsSchema,
  deliveryIndicatorSchema,
} from "../contracts/followup.schema";

export type CompanyIndicator = z.infer<typeof companyIndicatorSchema>;
export type DeliveryDetail = z.infer<typeof deliveryDetailSchema>;
export type DeliveryDetails = z.infer<typeof deliveryDetailsSchema>;
export type DeliveryIndicator = z.infer<typeof deliveryIndicatorSchema>;

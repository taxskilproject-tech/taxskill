import type { z } from "zod";

import type {
  activityFiltersSchema,
  activityListSchema,
  additionalRuleSchema,
} from "@/domain/activities/contracts/activity.schema";
export type ActivityFilters = z.infer<typeof activityFiltersSchema>;
export type ActivityList = z.infer<typeof activityListSchema>;
export type AdditionalRule = z.infer<typeof additionalRuleSchema>;
export type ActivityFilterName = keyof ActivityFilters;

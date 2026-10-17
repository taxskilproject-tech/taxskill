import type { z } from "zod";

import type {
  DOCUMENT_MODULES,
  FREQUENCIES,
} from "@/domain/documents/constants/engine";
import type {
  calendarPreviewSchema,
  engineRequirementSchema,
  engineVersionSchema,
} from "@/domain/documents/contracts/engine.schema";

export type Frequency = (typeof FREQUENCIES)[number];
export type DocumentModule = (typeof DOCUMENT_MODULES)[number];
export type EngineVersion = z.infer<typeof engineVersionSchema>;
export type EngineRequirement = z.infer<typeof engineRequirementSchema>;
export type CalendarPreview = z.infer<typeof calendarPreviewSchema>;

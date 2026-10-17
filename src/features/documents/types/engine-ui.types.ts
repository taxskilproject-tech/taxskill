import type { RefObject } from "react";

import type {
  DocumentResult,
  ObligationSummary,
  RuleRow,
  SlotSpec,
} from "@/domain/documents/types/document.types";
import type {
  DocumentModule,
  EngineVersion,
  Frequency,
} from "@/domain/documents/types/engine.types";

export interface RecurrenceFieldsProps {
  frequency: Frequency;
  onFrequency: (value: Frequency) => void;
  configuration?: EngineVersion;
  allowEventual?: boolean;
}
export interface RuleMetadataProps {
  rule?: RuleRow;
  maximum: number;
  onMaximum: (value: number) => void;
}
export interface RuleSlotsProps {
  maximum: number;
  slots?: SlotSpec[];
}
export interface RuleConditionsProps {
  frequency: Frequency;
  module: DocumentModule;
  configuration?: EngineVersion;
}
export interface RuleResponsibilityProps {
  companyId: string;
  module: DocumentModule;
  rule?: RuleRow;
}
export interface ResponsiblePickerProps {
  companyId: string | null;
  module: DocumentModule | "actividades";
  selected?: string | null;
  name?: string;
  disabled?: boolean;
}
export interface RulePreviewProps {
  form: RefObject<HTMLFormElement | null>;
}
export interface RuleEngineProps {
  rule: RuleRow;
}
export interface GenerationResultProps {
  result: DocumentResult | null;
}
export interface ReassignmentProps {
  summary: ObligationSummary;
}

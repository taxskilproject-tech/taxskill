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
  frequency: Frequency | null;
  onFrequency: (value: Frequency) => void;
  configuration?: RecurrenceConfiguration;
  allowEventual?: boolean;
  allowIncomplete?: boolean;
}
export type RecurrenceConfiguration = Pick<
  EngineVersion,
  "interval_count" | "interval_unit" | "anchor_date"
> & { deadline_offset_days: number | null };
export interface DeadlineFieldsProps {
  initial?: number | null;
  eventual: boolean;
  allowIncomplete?: boolean;
}
export interface RuleMetadataProps {
  companyId?: string;
  rule?: RuleRow;
  maximum: number;
  onMaximum: (value: number) => void;
}
export type RuleStartFieldsProps = Pick<RuleMetadataProps, "rule" | "companyId">;
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

export interface RequirementValidationSlot {
  position_code: string;
  display_order: number;
  max_file_bytes: number;
  allowed_formats: string[];
}
export interface RequirementValidationConditions {
  employment_stage: string;
  event_types: string[];
  termination_reasons: string[];
}
export interface RequirementValidationInput {
  module?: string;
  frequency: string;
  interval_count: number | null;
  interval_unit: string | null;
  anchor_date: string | null;
  deadline_offset_days: number;
  inherit_responsible: boolean;
  delivery_responsible_id: string | null;
  max_file_bytes: number;
  allowed_formats: string[];
  deliverable_specs: RequirementValidationSlot[];
  applicability_conditions: RequirementValidationConditions;
}

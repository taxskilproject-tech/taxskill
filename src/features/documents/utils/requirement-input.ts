import { FILE_FORMATS } from "@/domain/documents/constants/documents";
import { MAX_DELIVERABLES } from "@/domain/documents/constants/engine";
import { engineRequirementSchema } from "@/domain/documents/contracts/engine.schema";
import type { RuleRow } from "@/domain/documents/types/document.types";

function nullableText(data: FormData, name: string) {
  return String(data.get(name) ?? "").trim() || null;
}
export function readRecurrenceForm(data: FormData) {
  const frequency = String(data.get("frequency") ?? "mensual");
  return {
    frequency,
    interval_count:
      frequency === "personalizada" ? Number(data.get("interval_count")) : null,
    interval_unit:
      frequency === "personalizada"
        ? nullableText(data, "interval_unit")
        : null,
    anchor_date: nullableText(data, "anchor_date"),
    deadline_offset_days: Number(data.get("deadline_offset_days")),
    reference_date:
      nullableText(data, "reference_date") ??
      nullableText(data, "control_start_date") ??
      nullableText(data, "effective_from"),
  };
}
export function parseRequirementForm(
  data: FormData,
  maximum: number,
  rule?: RuleRow,
) {
  return engineRequirementSchema.safeParse({
    ...(rule
      ? {
          id: rule.id,
          expected_revision: rule.revision,
          employment_period_id: rule.employment_period_id,
        }
      : {}),
    company_id: data.get("company_id"),
    document_type_id: data.get("document_type_id"),
    module: data.get("module"),
    title: data.get("title"),
    description: nullableText(data, "description"),
    ...readRecurrenceForm(data),
    effective_from: nullableText(data, "effective_from"),
    ...(!rule ? { control_start_date: String(data.get("control_start_date") ?? "") } : {}),
    priority: data.get("priority"),
    is_required: data.has("is_required"),
    active: data.has("active"),
    inherit_responsible: data.has("inherit_responsible"),
    delivery_responsible_id: nullableText(data, "delivery_responsible_id"),
    max_file_bytes: Number(data.get("max_file_bytes") ?? maximum),
    allowed_formats: [...FILE_FORMATS],
    deliverable_specs: readDeliverableSpecs(data),
    applicability_conditions: {
      schema_version: 1,
      employment_stage: String(data.get("employment_stage") ?? "any"),
      event_types: data.getAll("event_types"),
      termination_reasons: data.getAll("termination_reasons"),
    },
  });
}
export function readDeliverableSpecs(data: FormData) {
  const count = Number(data.get("slot_count"));
  const positions =
    Number.isInteger(count) && count >= 1 && count <= MAX_DELIVERABLES
      ? Array.from({ length: count }, (_, index) => index + 1)
      : [];
  return positions.map((position) => ({
    position_code: data.get(`slot_code_${position}`),
    label: data.get(`slot_label_${position}`),
    display_order: Number(data.get(`slot_order_${position}`)),
    allowed_formats: data.getAll(`slot_formats_${position}`),
    max_file_bytes: Number(data.get(`slot_max_${position}`)),
  }));
}

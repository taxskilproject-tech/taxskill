import { additionalInputSchema } from "@/domain/activities/contracts/activity.schema";
import type { AdditionalRule } from "@/domain/activities/types/activity.types";
import { FILE_FORMATS } from "@/domain/documents/constants/documents";
import {
  readDeliverableSpecs,
  readRecurrenceForm,
} from "@/features/documents/utils/requirement-input";

export function parseAdditionalInput(data: FormData, rule?: AdditionalRule) {
  const recurrence = readRecurrenceForm(data);
  return additionalInputSchema.safeParse({
    ...(rule ? { id: rule.id, expected_revision: rule.revision } : {}),
    company_id: String(data.get("company_id") ?? "") || null,
    title: data.get("title"),
    description: String(data.get("description") ?? "").trim() || null,
    ...recurrence,
    due_date: recurrence.frequency === "unica" ? recurrence.anchor_date : null,
    priority: data.get("priority"),
    is_required: true,
    active: rule?.active ?? true,
    delivery_responsible_id: data.get("delivery_responsible_id"),
    max_file_bytes: Number(data.get("max_file_bytes")),
    allowed_formats: [...FILE_FORMATS],
    deliverable_specs: readDeliverableSpecs(data),
  });
}

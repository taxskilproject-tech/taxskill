import type { RuleRow } from "@/domain/documents/types/document.types";

export function getRuleState(rule: RuleRow) {
  if (rule.deleted_at) return "Eliminada";
  if (rule.active) return "Activa";
  if (
    rule.operation_pauses.some((pause) => pause.reason !== "Borrador inicial")
  )
    return "Pausada";
  return "Borrador";
}

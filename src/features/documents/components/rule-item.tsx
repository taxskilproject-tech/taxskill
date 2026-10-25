import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { RecordInspector } from "@/components/organisms/record-inspector";
import {
  FREQUENCY_LABELS,
  MODULE_LABELS,
} from "@/domain/documents/constants/engine";
import { getRuleState } from "@/domain/documents/utils/rule-state";
import { RuleOperations } from "@/features/documents/components/rule-operations";
import type { RuleItemProps } from "@/features/documents/types/document-ui.types";

export function RuleItem({ rule, onEdit }: RuleItemProps) {
  return (
    <article className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">{rule.title}</h3>
        <p className="text-xs text-slate-600">
          {rule.company_name} · {MODULE_LABELS[rule.module]}
        </p>
        <p className="text-xs text-slate-600">
          {FREQUENCY_LABELS[rule.configuration.frequency]} · v
          {rule.configuration.version_number} ·{" "}
          <Badge
            tone={
              rule.deleted_at ? "neutral" : rule.active ? "success" : "warning"
            }
          >
            {getRuleState(rule)}
          </Badge>
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        {!rule.deleted_at && (
          <Button
            onClick={onEdit}
            variant="secondary"
            className="hidden px-2 sm:inline-flex"
          >
            Editar
          </Button>
        )}
        <RecordInspector title={rule.title} label="Gestionar">
          {!rule.deleted_at && (
            <Button onClick={onEdit} variant="secondary">
              Crear nueva versión
            </Button>
          )}
          <RuleOperations rule={rule} />
        </RecordInspector>
      </div>
    </article>
  );
}

"use client";
import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import {
  FREQUENCY_LABELS,
  GENERATION_BATCH_SIZE,
  MODULE_LABELS,
} from "@/domain/documents/constants/engine";
import { getRuleState } from "@/domain/documents/utils/rule-state";
import { DocumentLifecycle } from "@/features/documents/components/document-lifecycle";
import { GenerationResult } from "@/features/documents/components/generation-result";
import { RuleActiveControl } from "@/features/documents/components/rule-active-control";
import { RuleEventControl } from "@/features/documents/components/rule-event-control";
import { RuleProgress } from "@/features/documents/components/rule-progress";
import { useDocumentCommand } from "@/features/documents/hooks/use-document-command";
import type { RuleOperationsProps } from "@/features/documents/types/document-ui.types";

export function RuleOperations({ rule }: RuleOperationsProps) {
  const command = useDocumentCommand();
  const version = rule.configuration;
  const state = getRuleState(rule);
  return (
    <article className="space-y-2 rounded-lg border border-zinc-200 bg-white p-3">
      <div className="space-y-2">
        <h3 className="font-semibold">{rule.title}</h3>
        <p className="text-sm text-zinc-600">
          {rule.company_name} · {MODULE_LABELS[rule.module]} ·{" "}
          {FREQUENCY_LABELS[version.frequency]} · {state}
        </p>
        <p className="text-sm text-zinc-600">
          Versión {version.version_number}, vigente desde{" "}
          {version.effective_from}. {version.deliverable_specs.length} archivos
          requeridos · {version.is_required ? "Exigible" : "Opcional"}.
        </p>
        {rule.effective_configuration &&
          rule.effective_configuration.id !== version.id && (
            <p className="text-sm text-zinc-600">
              La versión {rule.effective_configuration.version_number} continúa
              vigente hasta iniciar el siguiente ciclo configurado.
            </p>
          )}
      </div>
      <details>
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
          Operación y trazabilidad
        </summary>
        <RuleProgress rule={rule} />
        <div className="flex flex-wrap items-start gap-3">
          {!rule.deleted_at &&
            rule.active &&
            version.frequency !== "eventual" && (
              <Button
                loading={command.busy}
                loadingText="Generando lote…"
                onClick={() => {
                  void command.submit("GenerateRule", {
                    rule_id: rule.id,
                    batch_size: GENERATION_BATCH_SIZE,
                  });
                }}
              >
                {rule.generation_cursor.has_more
                  ? "Continuar generación"
                  : "Generar obligaciones"}
              </Button>
            )}
          {!rule.deleted_at && <RuleActiveControl rule={rule} />}
          <DocumentLifecycle
            deleted={Boolean(rule.deleted_at)}
            entity="requirement_rules"
            id={rule.id}
            revision={rule.revision}
          />
        </div>
        {!rule.deleted_at &&
          rule.active &&
          version.frequency === "eventual" && <RuleEventControl rule={rule} />}
      </details>
      {command.error && (
        <FeedbackMessage kind="error">{command.error}</FeedbackMessage>
      )}
      <GenerationResult result={command.result} />
    </article>
  );
}

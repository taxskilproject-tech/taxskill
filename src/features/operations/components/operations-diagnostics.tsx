import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { HealthIssueLink } from "@/features/operations/components/health-issue-link";
import type { OperationsDiagnosticsProps } from "@/features/operations/types/health-evaluation.types";
import { describeHealthIssue } from "@/features/operations/utils/describe-health-issue";

export function OperationsDiagnostics({
  evaluation,
}: OperationsDiagnosticsProps) {
  return (
    <div className="space-y-3">
      {evaluation.mode === "prepublication" && (
        <FeedbackMessage>
          Evaluación de prepublicación: no exige generación ni WhatsApp activos.
          Este modo no acredita operación productiva ni cambia la programación.
        </FeedbackMessage>
      )}
      {evaluation.issues.length > 0 ? (
        <FeedbackMessage kind="error">
          <p className="font-medium">La operación requiere atención</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {evaluation.issues.map((issue) => (
              <li key={`${issue.code}:${issue.job ?? "system"}`}>
                {describeHealthIssue(issue)} <HealthIssueLink issue={issue} />
              </li>
            ))}
          </ul>
        </FeedbackMessage>
      ) : (
        <FeedbackMessage kind="success">
          {evaluation.status === "paused"
            ? "Prepublicación declarada: controles evaluados sin incidencias. Automatización productiva pendiente."
            : "Sin incidencias en los controles operativos evaluados."}
        </FeedbackMessage>
      )}
    </div>
  );
}

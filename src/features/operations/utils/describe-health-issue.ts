import { HEALTH_MESSAGES } from "@/features/operations/constants/health-messages";
import { JOB_LABELS } from "@/features/operations/constants/operations";
import type { HealthIssue } from "@/features/operations/types/health-evaluation.types";

export function describeHealthIssue(issue: HealthIssue): string {
  const message =
    HEALTH_MESSAGES[issue.code] ??
    "Revisa el diagnóstico del ejecutor operativo.";
  if (!issue.job) return message;
  const name = JOB_LABELS[issue.job] ?? "Proceso programado";
  return `El proceso «${name}» ${message}`;
}

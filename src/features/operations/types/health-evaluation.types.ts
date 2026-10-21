import type { OperationsSnapshot } from "@/features/operations/types/operations.types";

export type OperationMode = "production" | "prepublication";
export interface HealthIssue {
  code: string;
  job?: string;
}
export interface HealthEvaluation {
  status: "healthy" | "degraded" | "paused";
  mode: OperationMode;
  issues: HealthIssue[];
}
export interface HealthEvaluationInput {
  snapshot: OperationsSnapshot;
  mode: OperationMode;
  now: number;
}
export type JobHealth = OperationsSnapshot["jobs"][number];

import type { z } from "zod";

import type { operationsSnapshotSchema } from "@/features/operations/contracts/operations.schema";

export type RateLimitBucket = "admin" | "receipts";

export interface RateLimitConfiguration {
  limit: number;
  windowSeconds: number;
}

export type OperationsSnapshot = z.infer<typeof operationsSnapshotSchema>;
export interface OperationsStatusProps {
  snapshot: OperationsSnapshot;
}
export interface OperationMetric {
  key:
    | "stalled_uploads"
    | "rejected_uploads"
    | "generation_failures"
    | "invalid_responsibles"
    | "whatsapp_unknown"
    | "whatsapp_failed";
  label: string;
}

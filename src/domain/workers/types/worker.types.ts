import type { z } from "zod";

import type { WORKER_OPERATIONS } from "@/domain/workers/constants/workers";
import type {
  employmentInputSchema,
  employmentRowSchema,
  workerDetailSchema,
  workerInputSchema,
  workerListSchema,
  workerResultSchema,
  workerRowSchema,
} from "@/domain/workers/contracts/worker.schema";

export type Worker = z.infer<typeof workerRowSchema>;
export type WorkerList = z.infer<typeof workerListSchema>;
export type WorkerDetail = z.infer<typeof workerDetailSchema>;
export type WorkerInput = z.infer<typeof workerInputSchema>;
export type Employment = z.infer<typeof employmentRowSchema>;
export type EmploymentInput = z.infer<typeof employmentInputSchema>;
export type WorkerResult = z.infer<typeof workerResultSchema>;
export type WorkerOperation = (typeof WORKER_OPERATIONS)[number];
export interface WorkerQueryInput {
  company_id: string;
  worker_id?: string;
  employment_period_id?: string;
  page?: number;
  q?: string;
  status?: string;
  include_deleted?: boolean;
}

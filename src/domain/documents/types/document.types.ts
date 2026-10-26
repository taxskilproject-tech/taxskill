import type { z } from "zod";

import type { DOCUMENT_OPERATIONS } from "@/domain/documents/constants/documents";
import type {
  catalogRowSchema,
  cycleSchema,
  deliverableSchema,
  detailSchema,
  documentResultSchema,
  documentRowSchema,
  intentSchema,
  requirementInputSchema,
  ruleRowSchema,
  slotSpecSchema,
  summarySchema,
  versionSchema,
} from "@/domain/documents/contracts/document.schema";

export type DocumentOperation = (typeof DOCUMENT_OPERATIONS)[number];
export type ObligationSummary = z.infer<typeof summarySchema>;
export type ObligationDetail = z.infer<typeof detailSchema>;
export type Deliverable = z.infer<typeof deliverableSchema>;
export type SubmissionCycle = z.infer<typeof cycleSchema>;
export type UploadIntent = z.infer<typeof intentSchema>;
export type SlotSpec = z.infer<typeof slotSpecSchema>;
export type DocumentVersion = z.infer<typeof versionSchema>;
export type CatalogRow = z.infer<typeof catalogRowSchema>;
export type RuleRow = z.infer<typeof ruleRowSchema>;
export type DocumentRow = z.infer<typeof documentRowSchema>;
export type DocumentResult = z.infer<typeof documentResultSchema>;
export type RequirementInput = z.infer<typeof requirementInputSchema>;
export interface DocumentQueryInput {
  include_history?: boolean;
  year?: number;
  month?: number;
  tax_code?: string;
  document_code?: string;
  document_scope?: "calendar" | "periodic" | "event" | "checklist";
  active?: boolean;
  worker_id?: string;
  employment_period_id?: string;
  employment_stage?: string;
  period?: string;
  state?: string;
  page?: number;
  company_id?: string;
  module?: string;
  id?: string;
  q?: string;
  include_deleted?: boolean;
}
export interface UploadProgress {
  phase: "idle" | "reserving" | "uploading" | "validating" | "ready";
  percent: number;
}
export interface StorageTransferError {
  originalResponse: { getStatus: () => number };
}
export interface UploadTransfer {
  file: File;
  intent: UploadIntent;
  signal: AbortSignal;
  onProgress: (percent: number) => void;
}
export interface UploadExecution {
  file: File | null;
  deliverable: Deliverable;
  cycle: SubmissionCycle;
  recovery?: UploadIntent;
  signal: AbortSignal;
  onProgress: (progress: UploadProgress) => void;
  reserve: (input: Record<string, unknown>) => Promise<DocumentResult>;
}

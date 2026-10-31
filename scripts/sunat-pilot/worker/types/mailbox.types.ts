import type { z } from "zod";

import type {
  mailboxCheckpointSchema,
  mailboxJobSchema,
  mailboxKindSchema,
  mailboxPageSchema,
} from "../contracts/mailbox.schema";

export type MailboxKind = z.infer<typeof mailboxKindSchema>;
export type MailboxPage = z.infer<typeof mailboxPageSchema>;
export type MailboxItem = MailboxPage["items"][number];
export type MailboxJob = z.infer<typeof mailboxJobSchema>;
export type MailboxCheckpoint = z.infer<typeof mailboxCheckpointSchema>;
export type MailboxFailureCode =
  | "SOURCE_UNAVAILABLE"
  | "SESSION_EXPIRED"
  | "CREDENTIAL_REJECTED"
  | "VERIFICATION_REQUIRED"
  | "PAGE_INCONSISTENT"
  | "SOURCE_CHANGED"
  | "UNEXPECTED_RESPONSE"
  | "FILE_TOO_LARGE"
  | "BUDGET_EXHAUSTED"
  | "CONSENT_REQUIRED"
  | "JOB_ALREADY_RUNNING"
  | "JOB_INPUT_INVALID"
  | "CHECKPOINT_STORE_FAILED"
  | "CHECKPOINT_CAPACITY_REACHED"
  | "CHECKPOINT_INVALID";
export interface MailboxReadRequest {
  connectionKey: string;
  mailbox: MailboxKind;
  page: number;
  signal: AbortSignal;
}
export interface MailboxTransport {
  readPage(request: MailboxReadRequest): Promise<unknown>;
  renewSession(signal: AbortSignal): Promise<void>;
}
export interface MailboxCheckpointStore {
  prepare?(job: MailboxJob): Promise<void>;
  load(job: MailboxJob): Promise<unknown>;
  save(job: MailboxJob, checkpoint: MailboxCheckpoint): Promise<void>;
  savePartial?(
    job: MailboxJob,
    items: readonly MailboxItem[],
    checkpoint: MailboxCheckpoint,
  ): Promise<void>;
}
export interface MailboxExecutionMetrics {
  duration_ms: number;
  cpu_time_ms: number;
  peak_memory_mb: number;
  request_count: number;
  pages_read: number;
  pages_accepted: number;
  session_renewals: number;
}
export interface MailboxRunResult {
  status: "complete" | "partial" | "requires_attention";
  reason: MailboxFailureCode | null;
  checkpoint: MailboxCheckpoint;
  metrics: MailboxExecutionMetrics;
  last_success_may_advance: boolean;
}
export interface MailboxRunDependencies {
  transport: MailboxTransport;
  checkpoints: MailboxCheckpointStore;
}
export interface MailboxRunContext {
  job: MailboxJob;
  dependencies: MailboxRunDependencies;
  checkpoint: MailboxCheckpoint;
  requests: number;
  pages: number;
  pageRequests: number;
  sessionRenewals: number;
  startedAt: number;
  cpuStart: NodeJS.CpuUsage;
  signal: AbortSignal;
}
export interface ActiveMailboxJob {
  identity: string;
  promise: Promise<MailboxRunResult>;
}

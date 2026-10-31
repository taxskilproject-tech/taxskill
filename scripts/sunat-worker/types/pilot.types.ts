import type {
  MailboxFailureCode,
  MailboxKind,
  MailboxRunResult,
} from "../../sunat-pilot/worker/types/mailbox.types";
import type {
  verifyReadEffect,
  verifySessionRenewal,
} from "../services/pilot-checks";

export interface ContainerMetrics {
  peak_memory_mb: number | null;
  cpu_time_ms: number | null;
}

export type PilotStage =
  | "connecting"
  | "identity"
  | "periods"
  | "attachment"
  | "read_effect"
  | "renewal"
  | "finished";
export type PilotFailureCode =
  MailboxFailureCode | "PILOT_REPORT_STORE_FAILED" | "PILOT_CLEANUP_FAILED";
export interface PilotPeriodSummary {
  mailbox: MailboxKind;
  month: string;
  status: MailboxRunResult["status"];
  reason: MailboxRunResult["reason"];
  count: number;
  available_count: number;
  metrics: MailboxRunResult["metrics"];
}
export interface PilotAttachmentSummary {
  bytes: number;
  sha256: string;
  mime: string;
}
export interface PilotReportState {
  schema_version: 2;
  authorized_live: true;
  pilot_reference: string;
  current_stage: PilotStage;
  last_completed_stage: PilotStage | null;
  run_finished: boolean;
  verified_identity: boolean;
  query_and_attachment_complete: boolean;
  source_validated: false;
  stable_ids: boolean | null;
  read_effect: Awaited<ReturnType<typeof verifyReadEffect>> | null;
  session: Awaited<ReturnType<typeof verifySessionRenewal>> | null;
  results: PilotPeriodSummary[];
  attachment: PilotAttachmentSummary | null;
  failure: { stage: PilotStage; code: PilotFailureCode } | null;
  cleanup: "pending" | "closed" | "failed";
  cleanup_error: "PILOT_CLEANUP_FAILED" | null;
}
export interface PilotReport extends PilotReportState {
  metrics: {
    duration_ms: number;
    cpu_ms: number;
    max_rss_mb: number;
    requests: number;
    container: ContainerMetrics;
  };
}

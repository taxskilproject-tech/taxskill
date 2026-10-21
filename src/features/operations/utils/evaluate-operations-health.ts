import {
  JOB_PROGRESS_AGE_MS,
  MAX_PROGRESS_AGE_MS,
  REQUIRED_PRODUCTION_JOBS,
} from "@/features/operations/constants/health";
import type {
  HealthEvaluation,
  HealthEvaluationInput,
  HealthIssue,
  JobHealth,
} from "@/features/operations/types/health-evaluation.types";

function evaluateJob(
  job: JobHealth | undefined,
  name: string,
  now: number,
): HealthIssue[] {
  if (!job) return [{ code: "JOB_MISSING", job: name }];
  if (!job.active) return [{ code: "JOB_DISABLED", job: name }];
  if (!job.last_started_at) return [{ code: "JOB_NEVER_RAN", job: name }];
  const started = Date.parse(job.last_started_at);
  if (!Number.isFinite(started) || started > now)
    return [{ code: "JOB_INVALID_TIME", job: name }];
  if (job.last_status === "failed") return [{ code: "JOB_FAILED", job: name }];
  if (now - started > (JOB_PROGRESS_AGE_MS[name] ?? MAX_PROGRESS_AGE_MS))
    return [{ code: "JOB_STALLED", job: name }];
  return [];
}

export function evaluateOperationsHealth({
  snapshot,
  mode,
  now,
}: HealthEvaluationInput): HealthEvaluation {
  const required =
    mode === "production" ? REQUIRED_PRODUCTION_JOBS : ["h03-staging-cleanup"];
  const jobIssues = required.flatMap((name) =>
    evaluateJob(
      snapshot.jobs.find((job) => job.name === name),
      name,
      now,
    ),
  );
  const counters = [
    [snapshot.backup_overdue, "BACKUP_OVERDUE"],
    [snapshot.generation_failures, "GENERATION_FAILED"],
    [snapshot.automation_failures, "AUTOMATION_FAILED"],
    [snapshot.invalid_responsibles, "INVALID_RESPONSIBLES"],
    [snapshot.whatsapp_unknown, "WHATSAPP_UNKNOWN"],
    [snapshot.whatsapp_failed, "WHATSAPP_FAILED"],
    [snapshot.stalled_uploads, "UPLOAD_STALLED"],
  ] as const;
  const counterIssues = counters
    .filter(([value]) => Boolean(value))
    .map(([, code]) => ({ code }));
  const progressIssues: HealthIssue[] = [];
  if (
    mode === "production" &&
    snapshot.generation_pending_since &&
    now - Date.parse(snapshot.generation_pending_since) > MAX_PROGRESS_AGE_MS
  )
    progressIssues.push({ code: "GENERATION_NO_PROGRESS" });
  if (
    mode === "production" &&
    snapshot.deadline_pending_since &&
    now - Date.parse(snapshot.deadline_pending_since) > MAX_PROGRESS_AGE_MS
  )
    progressIssues.push({ code: "DEADLINES_NO_PROGRESS" });
  if (
    mode === "production" &&
    snapshot.digest_pending_since &&
    now - Date.parse(snapshot.digest_pending_since) > MAX_PROGRESS_AGE_MS
  )
    progressIssues.push({ code: "DIGESTS_NO_PROGRESS" });
  const issues = [...jobIssues, ...counterIssues, ...progressIssues];
  return {
    status: issues.length
      ? "degraded"
      : mode === "prepublication"
        ? "paused"
        : "healthy",
    mode,
    issues,
  };
}

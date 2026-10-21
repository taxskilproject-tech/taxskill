import { REQUIRED_PRODUCTION_JOBS } from "@/features/operations/constants/health";
import { operationsSnapshotSchema } from "@/features/operations/contracts/operations.schema";

export const operationNow = Date.parse("2026-10-19T15:00:00Z");
export function healthyOperations() {
  const instant = new Date(operationNow).toISOString();
  return operationsSnapshotSchema.parse({
    checked_at: instant,
    stalled_uploads: 0,
    rejected_uploads: 0,
    generation_failures: 0,
    invalid_responsibles: 0,
    whatsapp_unknown: 0,
    whatsapp_failed: 0,
    last_backup_at: instant,
    backup_overdue: false,
    jobs: REQUIRED_PRODUCTION_JOBS.map((name) => ({
      name,
      active: true,
      last_started_at: instant,
      last_status: "succeeded",
    })),
  });
}

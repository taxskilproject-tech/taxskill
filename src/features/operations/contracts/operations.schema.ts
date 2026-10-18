import { z } from "zod";

export const operationsSnapshotSchema = z.object({
  checked_at: z.iso.datetime({ offset: true }),
  stalled_uploads: z.number().int().nonnegative(),
  rejected_uploads: z.number().int().nonnegative(),
  generation_failures: z.number().int().nonnegative(),
  invalid_responsibles: z.number().int().nonnegative(),
  whatsapp_unknown: z.number().int().nonnegative(),
  whatsapp_failed: z.number().int().nonnegative(),
  last_backup_at: z.iso.datetime({ offset: true }).nullable(),
  backup_overdue: z.boolean(),
  jobs: z.array(
    z.object({
      name: z.string(),
      active: z.boolean(),
      last_started_at: z.string().nullable(),
      last_status: z.string().nullable(),
    }),
  ),
});

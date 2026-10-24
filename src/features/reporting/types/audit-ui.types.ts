import type { z } from "zod";

import type { auditResultSchema } from "@/domain/reporting/contracts/consultation.schema";

export interface AuditEventRowProps {
  event: z.infer<typeof auditResultSchema>["rows"][number];
}

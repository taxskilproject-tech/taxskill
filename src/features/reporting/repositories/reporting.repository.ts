import type { z } from "zod";

import { exportReceiptSchema } from "@/domain/reporting/contracts/reporting.schema";
import {
  asJson,
  requireBrowserClient,
} from "@/features/access/repositories/access.repository";
import { timedExportRequest } from "@/features/reporting/services/timed-export-request";
import type { ExportAuditTransport } from "@/features/reporting/types/export.types";
import { ExportAuditRejection } from "@/features/reporting/utils/export-audit-rejection";
import { decodeRpc } from "@/lib/supabase/utils/decode-rpc";

export async function queryReporting<T>(
  organizationId: string,
  resource: string,
  input: Record<string, unknown>,
  schema: z.ZodType<T>,
  signal: AbortSignal,
) {
  const response = await requireBrowserClient()
    .rpc("h07_query", {
      p_organization_id: organizationId,
      p_resource: resource,
      p_input: asJson(input),
    })
    .abortSignal(signal);
  const decoded = decodeRpc(response.data, response.error, schema);
  if (!decoded.ok) throw decoded.error;
  return decoded.data;
}

export async function recordReportExport(
  organizationId: string,
  requestId: string,
  stage: "start" | "finish",
  input: Record<string, unknown>,
  transport: ExportAuditTransport = {},
) {
  const response = await timedExportRequest({
    ...transport,
    request: (signal) =>
      requireBrowserClient()
        .rpc("h07_export", {
          p_organization_id: organizationId,
          p_request_id: requestId,
          p_stage: stage,
          p_input: asJson(input),
        })
        .abortSignal(signal),
  });
  const decoded = decodeRpc(response.data, response.error, exportReceiptSchema);
  if (!decoded.ok && decoded.error.code !== "DEPENDENCY_UNAVAILABLE")
    throw new ExportAuditRejection(decoded.error.code);
  if (!decoded.ok)
    throw new Error(
      "No se pudo confirmar el registro de exportación con el servidor.",
    );
  return decoded.data;
}

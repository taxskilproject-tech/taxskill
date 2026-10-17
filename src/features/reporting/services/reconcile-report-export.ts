import type { ExportReceipt } from "@/domain/reporting/types/reporting.types";
import { EXPORT_RECONCILE_TIMEOUT_MS } from "@/features/reporting/constants/export-transport";
import { recordReportExport } from "@/features/reporting/repositories/reporting.repository";
import type { ExportReconciliationOptions } from "@/features/reporting/types/export.types";

export async function reconcileReportExport({
  organizationId,
  requestId,
  filters,
  format,
  outcome,
  onProgress,
}: ExportReconciliationOptions): Promise<ExportReceipt> {
  onProgress("Conciliando el registro de exportación…");
  const transport = { timeoutMs: EXPORT_RECONCILE_TIMEOUT_MS };
  const input = { filters, format };
  // Reuse the reservation: a late start cannot create a second operation.
  const receipt = await recordReportExport(
    organizationId,
    requestId,
    "start",
    input,
    transport,
  );
  if (receipt.outcome !== "started") return receipt;
  try {
    return await recordReportExport(
      organizationId,
      requestId,
      "finish",
      { outcome },
      transport,
    );
  } catch {
    // The server may have committed despite a lost response or a concurrent finish.
    const confirmed = await recordReportExport(
      organizationId,
      requestId,
      "start",
      input,
      transport,
    );
    if (confirmed.outcome !== "started") return confirmed;
    throw new Error(
      "El registro de exportación todavía no tiene un resultado confirmado.",
    );
  }
}

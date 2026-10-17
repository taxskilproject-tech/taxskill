import { reportResultSchema } from "@/domain/reporting/contracts/reporting.schema";
import type { ExportReceipt } from "@/domain/reporting/types/reporting.types";
import {
  queryReporting,
  recordReportExport,
} from "@/features/reporting/repositories/reporting.repository";
import { fetchReportPages } from "@/features/reporting/services/export-pages";
import { generateReportInWorker } from "@/features/reporting/services/export-worker-client";
import { reconcileReportExport } from "@/features/reporting/services/reconcile-report-export";
import type { ReportExportOptions } from "@/features/reporting/types/export.types";
import { ExportAuditRejection } from "@/features/reporting/utils/export-audit-rejection";

export async function generateReport(options: ReportExportOptions) {
  const { organizationId, format, filters, result, signal, onProgress } =
    options;
  const requestId = crypto.randomUUID();
  let registered = false;
  signal.throwIfAborted();
  try {
    onProgress("Preparando exportación…");
    const receipt = await recordReportExport(
      organizationId,
      requestId,
      "start",
      { filters, format },
      { signal },
    );
    registered = true;
    signal.throwIfAborted();
    if (receipt.outcome !== "started")
      throw new Error(
        "Esta operación ya terminó. Vuelve a solicitar la exportación.",
      );
    if (
      receipt.fingerprint !== result.fingerprint ||
      receipt.count !== result.count
    )
      throw new Error(
        "El universo exportable cambió o tus permisos de exportación cubren menos filas. Actualiza o acota el reporte.",
      );
    const rows = await fetchReportPages({
      receipt,
      filters,
      signal,
      onProgress,
      fetchPage: (input, abort) =>
        queryReporting(
          organizationId,
          "report",
          input,
          reportResultSchema,
          abort,
        ),
    });
    onProgress(
      `Generando ${format === "pdf" ? "PDF" : "Excel"}: ${rows.length} filas…`,
    );
    const generatedAt = new Date().toISOString();
    const blob = await generateReportInWorker({
      signal,
      payload: {
        rows,
        filters,
        format,
        metrics: result.metrics,
        groups: result.groups,
        generatedAt,
        queriedAt: result.queried_at,
      },
    });
    signal.throwIfAborted();
    onProgress("Verificando datos y registrando resultado…");
    await recordReportExport(
      organizationId,
      requestId,
      "finish",
      { outcome: "generated", row_count: rows.length },
      { signal },
    );
    signal.throwIfAborted();
    return {
      blob,
      filename: `taxskill-${filters.report}-${generatedAt.slice(0, 10)}.${format}`,
      rows,
    };
  } catch (error) {
    if (!registered && error instanceof ExportAuditRejection) throw error;
    let confirmed: ExportReceipt;
    try {
      confirmed = await reconcileReportExport({
        organizationId,
        requestId,
        filters,
        format,
        onProgress,
        outcome: signal.aborted ? "cancelled" : "failed",
      });
    } catch {
      throw new Error(
        `La exportación se interrumpió. No se descargó ningún archivo. El resultado de auditoría requiere conciliación. Referencia: ${requestId}.`,
      );
    }
    if (signal.aborted && confirmed.outcome === "generated")
      throw new Error(
        "El archivo quedó preparado en auditoría, pero la exportación se canceló y no se descargó.",
      );
    throw error;
  }
}

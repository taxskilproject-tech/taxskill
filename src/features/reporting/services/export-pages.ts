import {
  EXPORT_BATCH_SIZE,
  EXPORT_MAX_ROWS,
} from "@/domain/reporting/constants/report-columns";
import type { ReportRow } from "@/domain/reporting/types/reporting.types";
import type { FetchReportPagesOptions } from "@/features/reporting/types/export.types";

export async function fetchReportPages({
  receipt,
  filters,
  signal,
  fetchPage,
  onProgress,
}: FetchReportPagesOptions): Promise<ReportRow[]> {
  if (receipt.count > EXPORT_MAX_ROWS)
    throw new Error(
      `Este exportador admite ${EXPORT_MAX_ROWS.toLocaleString("es-PE")} filas por archivo. Acota el periodo o la empresa.`,
    );
  const rows: ReportRow[] = [];
  const pages = Math.max(1, Math.ceil(receipt.count / EXPORT_BATCH_SIZE));
  for (let page = 1; page <= pages; page += 1) {
    signal.throwIfAborted();
    const batch = await fetchPage(
      { ...filters, page, pageSize: EXPORT_BATCH_SIZE },
      signal,
    );
    signal.throwIfAborted();
    if (
      batch.fingerprint !== receipt.fingerprint ||
      batch.count !== receipt.count
    )
      throw new Error(
        "Los datos cambiaron durante la consulta. Actualiza el reporte y vuelve a exportar.",
      );
    const expected = Math.min(EXPORT_BATCH_SIZE, receipt.count - rows.length);
    if (batch.rows.length !== expected)
      throw new Error(
        "La consulta devolvió un lote incompleto. No se generó el archivo.",
      );
    rows.push(...batch.rows);
    onProgress(`Consultando filas: ${rows.length} de ${receipt.count}`);
  }
  if (new Set(rows.map((row) => row.id)).size !== receipt.count)
    throw new Error(
      "Se detectaron filas repetidas. Actualiza el reporte y vuelve a exportar.",
    );
  return rows;
}

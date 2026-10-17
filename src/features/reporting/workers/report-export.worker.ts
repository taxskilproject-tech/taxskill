import type { ExportPayload } from "@/domain/reporting/types/reporting.types";

self.onmessage = async (event: MessageEvent<ExportPayload>) => {
  try {
    const payload = event.data;
    const blob =
      payload.format === "xlsx"
        ? await (
            await import("@/features/reporting/services/excel-report")
          ).generateExcel(payload)
        : await (
            await import("@/features/reporting/services/pdf-report")
          ).generatePdf(payload);
    self.postMessage({ blob });
  } catch {
    self.postMessage({
      error:
        "No se pudo generar el archivo completo. Reduce el alcance o vuelve a intentarlo.",
    });
  }
};

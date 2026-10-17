import type { ExportWorkerMessage } from "@/domain/reporting/types/reporting.types";
import type { ExportWorkerOptions } from "@/features/reporting/types/export.types";

export function generateReportInWorker({
  payload,
  signal,
}: ExportWorkerOptions): Promise<Blob> {
  signal.throwIfAborted();
  const worker = new Worker(
    new URL("../workers/report-export.worker.ts", import.meta.url),
    { type: "module" },
  );
  return new Promise((resolve, reject) => {
    function cleanup() {
      worker.terminate();
      signal.removeEventListener("abort", cancel);
    }
    function cancel() {
      cleanup();
      reject(new DOMException("Exportación cancelada", "AbortError"));
    }
    worker.onmessage = (event: MessageEvent<ExportWorkerMessage>) => {
      cleanup();
      if (event.data.blob) resolve(event.data.blob);
      else
        reject(new Error(event.data.error ?? "No se pudo generar el archivo."));
    };
    worker.onerror = () => {
      cleanup();
      reject(
        new Error(
          "No se pudo iniciar el generador de archivos. Reintenta la exportación.",
        ),
      );
    };
    signal.addEventListener("abort", cancel, { once: true });
    worker.postMessage(payload);
  });
}

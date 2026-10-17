"use client";
import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { useReportExport } from "@/features/reporting/hooks/use-report-export";
import type { ExportControlsProps } from "@/features/reporting/types/reporting-ui.types";

export function ExportControls({
  result,
  filters,
  allowed,
}: ExportControlsProps) {
  const action = useReportExport(filters, result);
  if (!allowed)
    return (
      <p className="text-sm text-zinc-600">
        Tu cuenta puede consultar este reporte. Solicita el permiso de
        exportación al administrador para descargarlo.
      </p>
    );
  return (
    <section aria-label="Exportar el resultado completo" className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={Boolean(action.format)}
          loading={action.format === "xlsx"}
          loadingText={
            action.cancelling ? "Cancelando exportación…" : "Generando Excel…"
          }
          onClick={() => {
            void action.start("xlsx");
          }}
          variant="secondary"
        >
          Exportar Excel
        </Button>
        <Button
          disabled={Boolean(action.format)}
          loading={action.format === "pdf"}
          loadingText={
            action.cancelling ? "Cancelando exportación…" : "Generando PDF…"
          }
          onClick={() => {
            void action.start("pdf");
          }}
          variant="secondary"
        >
          Exportar PDF
        </Button>
        {action.format && (
          <Button
            loading={action.cancelling}
            loadingText="Cancelando…"
            onClick={action.cancel}
            variant="secondary"
          >
            Cancelar exportación
          </Button>
        )}
      </div>
      <p aria-live="polite" className="text-sm text-zinc-600" role="status">
        {action.progress ||
          `Se exportarán las ${result.count} obligaciones del resultado, con los filtros actuales.`}
      </p>
      {action.error && (
        <FeedbackMessage kind="error">{action.error}</FeedbackMessage>
      )}
    </section>
  );
}

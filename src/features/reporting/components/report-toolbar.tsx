import { Button } from "@/components/atoms/button";
import { Select } from "@/components/atoms/select";
import { ExportControls } from "@/features/reporting/components/export-controls";
import type { ReportToolbarProps } from "@/features/reporting/types/reporting-ui.types";

export function ReportToolbar({
  filters,
  onChange,
  onReset,
  result,
  allowed,
}: ReportToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor="report-kind">
        Reporte
      </label>
      <Select
        className="min-w-0 flex-1 sm:max-w-xs"
        id="report-kind"
        onChange={(event) => onChange("report", event.target.value)}
        value={filters.report}
      >
        <option value="detail">Detalle de obligaciones</option>
        <option value="compliance">Cumplimiento por empresa y módulo</option>
        <option value="pending">Pendientes de aprobación</option>
        <option value="deadlines">Vencimientos de entrega pendientes</option>
        <option value="observed">Observaciones</option>
        <option value="period">Detalle por periodo</option>
      </Select>
      <Button
        aria-label="Limpiar filtros"
        className="px-3"
        onClick={onReset}
        variant="secondary"
      >
        Limpiar
      </Button>
      {result && (
        <details className="relative shrink-0">
          <summary className="flex min-h-11 cursor-pointer items-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium">
            Exportar
          </summary>
          <div className="absolute right-0 z-30 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-200 bg-white p-3 shadow-lg">
            <ExportControls
              allowed={allowed}
              filters={filters}
              result={result}
            />
          </div>
        </details>
      )}
    </div>
  );
}

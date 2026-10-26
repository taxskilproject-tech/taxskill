import { Button } from "@/components/atoms/button";
import { DOCUMENT_MONTHS } from "@/features/document-workspace/constants/documents";
import type { DocumentMonthPickerProps } from "@/features/document-workspace/types/document-workspace-ui.types";

export function DocumentMonthPicker({
  months,
  year,
  onMonth,
}: DocumentMonthPickerProps) {
  return (
    <section aria-labelledby="document-period-heading" className="space-y-3">
      <div>
        <h2 className="font-semibold" id="document-period-heading">
          Selecciona el periodo de trabajo
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Documentos de {year}, organizados por mes. El vencimiento puede
          corresponder al mes siguiente.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {DOCUMENT_MONTHS.map((month) => {
          const count =
            months.find((item) => item.month === month.value)?.count ?? 0;
          return (
            <Button
              className="min-h-20 flex-col items-start text-left"
              key={month.value}
              onClick={() => onMonth(String(month.value))}
              variant="secondary"
            >
              <span className="font-semibold capitalize">{month.label}</span>
              <span className="text-xs font-normal text-slate-600">
                {count
                  ? `${count} ${count === 1 ? "obligación" : "obligaciones"}`
                  : "Sin obligaciones generadas"}
              </span>
            </Button>
          );
        })}
      </div>
    </section>
  );
}

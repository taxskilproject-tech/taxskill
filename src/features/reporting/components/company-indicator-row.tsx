import { Button } from "@/components/atoms/button";
import { compliance } from "@/domain/reporting/utils/report-filters";

import type {
  CompanyIndicatorRowProps,
  DeliveryIndicatorAction,
} from "../types/followup-ui.types";

export function CompanyIndicatorRow({
  row,
  onSelect,
}: CompanyIndicatorRowProps) {
  const values: DeliveryIndicatorAction[] = [
    {
      id: "compliance",
      label: "Cumplimiento documental",
      value: compliance(row.approved, row.required),
    },
    { id: "pending", label: "Pendientes de entrega", value: row.pending },
    { id: "on_time", label: "Entregados a tiempo", value: row.on_time },
    { id: "late", label: "Fuera de plazo", value: row.late },
  ];
  const controls = values.map((item) => (
    <Button
      key={item.id}
      variant="secondary"
      onClick={() => onSelect(item.id)}
      aria-label={item.label + " de " + row.company_name}
    >
      <span className="flex flex-col items-start">
        <span className="text-xs">{item.label}</span>
        <span className="text-lg font-semibold tabular-nums">{item.value}</span>
      </span>
    </Button>
  ));
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="hidden items-center gap-3 md:grid md:grid-cols-[minmax(10rem,1fr)_repeat(4,minmax(0,1fr))]">
        <h3 className="text-sm font-semibold">{row.company_name}</h3>
        {controls}
      </div>
      <details className="md:hidden">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold">
          {row.company_name}
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-2">{controls}</div>
      </details>
    </article>
  );
}

"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SelectField } from "@/components/molecules/select-field";
import { Pagination } from "@/features/access/components/pagination";
import type { StageSelectorProps } from "@/features/workers/types/worker-ui.types";

export function StageSelector({ detail, page, onPage }: StageSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const parameters = useSearchParams();
  const selected = detail.selected_period;
  if (!selected)
    return (
      <p className="text-sm text-zinc-600">
        Todavía no hay etapas laborales registradas.
      </p>
    );
  return (
    <section className="space-y-3">
      <SelectField
        id="employment-selector"
        label="Etapa del expediente"
        onChange={(event) => {
          const next = new URLSearchParams(parameters.toString());
          next.set("employmentPeriodId", event.target.value);
          router.replace(`${pathname}?${next}`, { scroll: false });
        }}
        value={selected.id}
      >
        {!detail.period_rows.some((stage) => stage.id === selected.id) && (
          <option value={selected.id}>
            Etapa {selected.sequence_number} · {selected.start_date} a{" "}
            {selected.end_date ?? "actualidad"}
          </option>
        )}
        {detail.period_rows.map((stage) => (
          <option key={stage.id} value={stage.id}>
            Etapa {stage.sequence_number} · {stage.start_date} a{" "}
            {stage.end_date ?? "actualidad"}
          </option>
        ))}
      </SelectField>
      <Pagination count={detail.period_count} onPage={onPage} page={page} />
    </section>
  );
}

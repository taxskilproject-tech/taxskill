"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SelectField } from "@/components/molecules/select-field";
import { Pagination } from "@/features/access/components/pagination";
import { clearDocumentWorkspaceFilters } from "@/features/document-workspace/utils/document-period-navigation";
import { displayDate } from "@/features/documents/utils/document-presentation";
import type { StageSelectorProps } from "@/features/workers/types/worker-ui.types";

export function StageSelector({ detail, page, onPage }: StageSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const parameters = useSearchParams();
  const selected = detail.selected_period;
  if (!selected)
    return (
      <p className="text-sm text-zinc-600">
        Todavía no hay periodos laborales registrados.
      </p>
    );
  return (
    <section className="space-y-3">
      <SelectField
        id="employment-selector"
        label="Periodo laboral"
        onChange={(event) => {
          const next = clearDocumentWorkspaceFilters(
            new URLSearchParams(parameters.toString()),
          );
          next.set("employmentPeriodId", event.target.value);
          next.delete("obligationPage");
          next.delete("obligationPeriod");
          next.delete("obligationState");
          next.delete("deliverableId");
          router.replace(`${pathname}?${next}`, { scroll: false });
        }}
        value={selected.id}
      >
        {!detail.period_rows.some((stage) => stage.id === selected.id) && (
          <option value={selected.id}>
            Periodo {selected.sequence_number} ·{" "}
            {displayDate(selected.start_date)} a{" "}
            {selected.end_date ? displayDate(selected.end_date) : "actualidad"}
          </option>
        )}
        {detail.period_rows.map((stage) => (
          <option key={stage.id} value={stage.id}>
            Periodo {stage.sequence_number} · {displayDate(stage.start_date)} a{" "}
            {stage.end_date ? displayDate(stage.end_date) : "actualidad"}
          </option>
        ))}
      </SelectField>
      {detail.period_count > 25 && (
        <Pagination count={detail.period_count} onPage={onPage} page={page} />
      )}
    </section>
  );
}

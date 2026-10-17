import type { ReportResult } from "@/domain/reporting/types/reporting.types";
import { compliance } from "@/domain/reporting/utils/report-filters";

export function ReportGroups({ groups }: Pick<ReportResult, "groups">) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">
        Cumplimiento documental por empresa y área
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {groups
          .filter((group) => group.class === "documentary")
          .map((group) => (
            <article
              className="rounded-lg border border-zinc-200 bg-white p-4"
              key={`${group.company_id}-${group.module}`}
            >
              <h3 className="text-sm font-medium">{group.company_name}</h3>
              <p className="mt-1 text-xs text-zinc-500">{group.module}</p>
              <p className="mt-3 text-xl font-semibold">
                {compliance(group.approved, group.required)}
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                {group.approved}/{group.required} obligaciones exigibles
                aprobadas
              </p>
            </article>
          ))}
      </div>
    </section>
  );
}

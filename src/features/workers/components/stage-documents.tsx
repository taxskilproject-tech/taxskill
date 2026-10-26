"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import {
  EMPLOYMENT_STAGES,
  STAGE_LABELS,
} from "@/domain/workers/constants/workers";
import { DocumentPeriodWorkspace } from "@/features/document-workspace/components/document-period-workspace";
import { clearDocumentWorkspaceFilters } from "@/features/document-workspace/utils/document-period-navigation";
import type { StageDocumentsProps } from "@/features/workers/types/worker-ui.types";

export function StageDocuments({ detail }: StageDocumentsProps) {
  const pathname = usePathname();
  const parameters = useSearchParams();
  const requested = parameters.get("stage");
  const selected =
    EMPLOYMENT_STAGES.find((stage) => stage === requested) ?? "relacion";
  if (!detail.selected_period) return null;
  return (
    <section className="space-y-2">
      <nav
        aria-label="Documentos por etapa documental"
        className="flex flex-wrap gap-2 border-b border-zinc-200 pb-1"
      >
        {EMPLOYMENT_STAGES.map((stage) => {
          const next = clearDocumentWorkspaceFilters(
            new URLSearchParams(parameters.toString()),
          );
          next.set("stage", stage);
          return (
            <Link
              aria-current={selected === stage ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-lg px-4 text-sm ${selected === stage ? "bg-blue-700 text-white" : "hover:bg-zinc-100"}`}
              href={`${pathname}?${next}`}
              key={stage}
            >
              {STAGE_LABELS[stage]}
            </Link>
          );
        })}
      </nav>
      <DocumentPeriodWorkspace
        companyId={detail.worker.company_id}
        employmentPeriodId={detail.selected_period.id}
        employmentStage={selected}
        key={`${detail.selected_period.id}:${selected}`}
        module="laboral_trabajador"
        workerId={detail.worker.id}
      />
    </section>
  );
}

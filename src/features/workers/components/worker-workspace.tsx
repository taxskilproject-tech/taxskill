"use client";
import { Button } from "@/components/atoms/button";
import { SectionNavigation } from "@/components/molecules/section-navigation";
import { ResourceState } from "@/components/organisms/resource-state";
import { usePresentation } from "@/features/access/hooks/use-presentation";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { EmploymentActions } from "@/features/workers/components/employment-actions";
import { EmploymentEventForm } from "@/features/workers/components/employment-event-form";
import { EmploymentFacts } from "@/features/workers/components/employment-facts";
import { GenerationProgress } from "@/features/workers/components/generation-progress";
import { StageDocuments } from "@/features/workers/components/stage-documents";
import { StageSelector } from "@/features/workers/components/stage-selector";
import { WorkerFacts } from "@/features/workers/components/worker-facts";
import { WorkerLifecycle } from "@/features/workers/components/worker-lifecycle";
import type { WorkerWorkspaceProps } from "@/features/workers/types/worker-ui.types";

export function WorkerWorkspace({
  detail,
  canManage,
  page,
  onPage,
}: WorkerWorkspaceProps) {
  const { context } = useWorkspace();
  const [view, setView] = usePresentation("view", "documentos", [
    "documentos",
    "ficha",
    "eventos",
  ]);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 items-end gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
        <StageSelector detail={detail} onPage={onPage} page={page} />
        <SectionNavigation
          label="Sección del expediente"
          selected={view}
          onSelect={setView}
          items={[
            { id: "documentos", label: "Documentos" },
            { id: "ficha", label: "Ficha laboral" },
            { id: "eventos", label: "Eventos y generación" },
          ]}
        />
      </div>
      <div hidden={view !== "documentos"}>
        {detail.selected_period ? (
          <StageDocuments detail={detail} />
        ) : (
          <ResourceState
            title="Sin periodo laboral registrado"
            description="La ficha laboral permite registrar el primer ingreso."
            kind="empty"
            action={
              canManage ? (
                <Button onClick={() => setView("ficha")}>
                  Ir a ficha laboral
                </Button>
              ) : undefined
            }
          />
        )}
      </div>
      <div hidden={view !== "ficha"} className="space-y-2">
        <EmploymentActions
          canManage={canManage}
          detail={detail}
          key={detail.selected_period?.id ?? "empty"}
        />
        <WorkerFacts worker={detail.worker} />
        {detail.selected_period && (
          <EmploymentFacts stage={detail.selected_period} />
        )}
        {context.member.is_admin && canManage && (
          <details>
            <summary className="min-h-11 cursor-pointer py-3 text-sm">
              Conservación del trabajador
            </summary>
            <WorkerLifecycle
              key={detail.worker.deleted_at ?? "active"}
              worker={detail.worker}
            />
          </details>
        )}
      </div>
      <div hidden={view !== "eventos"} className="space-y-2">
        <GenerationProgress canManage={canManage} detail={detail} />
        <EmploymentEventForm
          canManage={canManage}
          detail={detail}
          key={`event:${detail.selected_period?.id}`}
        />
      </div>
    </div>
  );
}

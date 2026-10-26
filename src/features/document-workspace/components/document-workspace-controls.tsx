import { Button } from "@/components/atoms/button";
import { SectionNavigation } from "@/components/molecules/section-navigation";
import {
  EMPLOYMENT_STAGES,
  STAGE_LABELS,
} from "@/domain/workers/constants/workers";
import { DocumentPeriodControls } from "@/features/document-workspace/components/document-period-controls";
import type { DocumentWorkspaceControlsProps } from "@/features/document-workspace/types/document-workspace-ui.types";

export function DocumentWorkspaceControls({
  mode,
  navigation,
  years,
}: DocumentWorkspaceControlsProps) {
  return (
    <div className="space-y-2">
      {mode.showStages && (
        <SectionNavigation
          label="Etapa documental"
          selected={mode.stage ?? "relacion"}
          items={EMPLOYMENT_STAGES.map((stage) => ({
            id: stage,
            label: STAGE_LABELS[stage],
          }))}
          onSelect={(stage) => navigation.select("documentStage", stage)}
        />
      )}
      {mode.showEvents && (
        <nav
          aria-label="Documentación de la relación laboral"
          className="flex gap-2"
        >
          <Button
            aria-pressed={navigation.scope !== "event"}
            variant={navigation.scope !== "event" ? "primary" : "secondary"}
            onClick={() => navigation.select("documentScope", "periodic")}
          >
            Por periodo
          </Button>
          <Button
            aria-pressed={navigation.scope === "event"}
            variant={navigation.scope === "event" ? "primary" : "secondary"}
            onClick={() => navigation.select("documentScope", "event")}
          >
            Eventuales
          </Button>
        </nav>
      )}
      {mode.calendar ? (
        <div className={navigation.month ? "hidden lg:block" : undefined}>
          <DocumentPeriodControls navigation={navigation} years={years} />
        </div>
      ) : (
        <p className="text-sm text-slate-600">
          {mode.scope === "checklist" ? "Checklist" : "Documentos eventuales"}{" "}
          del periodo laboral seleccionado.
        </p>
      )}
    </div>
  );
}

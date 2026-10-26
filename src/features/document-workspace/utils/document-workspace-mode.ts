import type {
  DocumentPeriodSelection,
  DocumentPeriodWorkspaceProps,
  DocumentWorkspaceMode,
} from "@/features/document-workspace/types/document-workspace-ui.types";

export function documentWorkspaceMode(
  props: DocumentPeriodWorkspaceProps,
  selection: DocumentPeriodSelection,
): DocumentWorkspaceMode {
  const labor = props.module === "laboral_trabajador";
  const stage = props.employmentStage ?? (labor ? selection.stage : undefined);
  const scoped = Boolean(props.workerId && props.employmentPeriodId);
  const showEvents = scoped && stage === "relacion";
  const base = { stage, showEvents, showStages: labor && !props.workerId };
  if (scoped && (stage === "ingreso" || stage === "cese")) {
    return { ...base, scope: "checklist", calendar: false };
  }
  if (showEvents) {
    const event = selection.scope === "event";
    return { ...base, scope: event ? "event" : "periodic", calendar: !event };
  }
  return { ...base, scope: "calendar", calendar: true };
}

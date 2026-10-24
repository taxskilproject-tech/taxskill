"use client";
import { Button } from "@/components/atoms/button";
import { SectionNavigation } from "@/components/molecules/section-navigation";
import { ResourceState } from "@/components/organisms/resource-state";
import { REVIEW_LABELS } from "@/domain/documents/constants/documents";
import { usePresentation } from "@/features/access/hooks/use-presentation";
import { DeliverableCard } from "@/features/documents/components/deliverable-card";
import { VersionHistory } from "@/features/documents/components/version-history";
import type { ObligationWorkspaceProps } from "@/features/documents/types/document-ui.types";

export function ObligationWorkspace({
  detail,
  obligationId,
  canReview,
}: ObligationWorkspaceProps) {
  const [selectedId, selectDeliverable] = usePresentation("deliverableId", "");
  const [view, setView] = usePresentation("view", "entrega", [
    "entrega",
    "revision",
    "historial",
  ]);
  const selected = selectedId
    ? detail.deliverables.find((item) => item.id === selectedId)
    : (detail.deliverables.find((item) => item.review_state !== "aprobado") ??
      detail.deliverables[0]);
  return (
    <section className="space-y-3">
      <SectionNavigation
        label="Sección del documento"
        selected={view}
        onSelect={setView}
        items={[
          { id: "entrega", label: "Entrega" },
          ...(canReview ? [{ id: "revision", label: "Revisión" }] : []),
          { id: "historial", label: "Historial" },
        ]}
      />
      {view === "historial" ? (
        <VersionHistory obligationId={obligationId} summary={detail.summary} />
      ) : view === "revision" && !canReview ? (
        <ResourceState
          title="Revisión sin acceso"
          description="Tu cuenta puede consultar y entregar según sus permisos."
          kind="forbidden"
        />
      ) : (
        <div className="grid items-start gap-3 xl:grid-cols-[200px_minmax(0,1fr)]">
          <nav
            aria-label="Entregables de la obligación"
            className="flex flex-wrap gap-1 xl:flex-col"
          >
            {detail.deliverables.map((item) => (
              <Button
                aria-pressed={selected?.id === item.id}
                className="justify-start text-left"
                key={item.id}
                onClick={() => selectDeliverable(item.id)}
                variant={selected?.id === item.id ? "primary" : "secondary"}
              >
                {item.label} · {REVIEW_LABELS[item.review_state]}
              </Button>
            ))}
          </nav>
          {selected ? (
            <DeliverableCard
              deliverable={selected}
              detail={detail}
              section={view}
              key={selected.id}
            />
          ) : (
            <ResourceState
              title="Entregable no encontrado"
              description="Selecciona uno de los entregables disponibles."
              kind="not-found"
            />
          )}
        </div>
      )}
    </section>
  );
}

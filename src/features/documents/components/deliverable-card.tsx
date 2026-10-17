"use client";
import { Badge } from "@/components/atoms/badge";
import { canPerform } from "@/domain/access/utils/permissions";
import { REVIEW_LABELS } from "@/domain/documents/constants/documents";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { DownloadControl } from "@/features/documents/components/download-control";
import { ReviewControls } from "@/features/documents/components/review-controls";
import { UploadControl } from "@/features/documents/components/upload-control";
import type { DeliverableCardProps } from "@/features/documents/types/document-ui.types";

export function DeliverableCard({ deliverable, detail }: DeliverableCardProps) {
  const { context } = useWorkspace();
  const { summary } = detail;
  const cycle = detail.cycles.find(
    (item) => item.deliverable_id === deliverable.id,
  );
  const specs = detail.obligation.snapshot.deliverables.find(
    (item) => item.position_code === deliverable.position_code,
  );
  const recovery = detail.intents.find(
    (item) =>
      item.deliverable_id === deliverable.id &&
      item.expected_deliverable_revision === deliverable.revision,
  );
  function allowed(action: "upload" | "download") {
    return canPerform(
      context.capabilities,
      summary.company_id,
      summary.module,
      action,
      context.member.member_type,
    );
  }
  return (
    <article
      className="space-y-5 rounded-xl border border-zinc-200 bg-white p-5"
      id={`entregable-${deliverable.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500">
            Archivo {deliverable.display_order}
          </p>
          <h2 className="mt-1 text-lg font-semibold">{deliverable.label}</h2>
        </div>
        <Badge>{REVIEW_LABELS[deliverable.review_state]}</Badge>
      </div>
      {cycle && (
        <p className="text-sm text-zinc-600">
          Ciclo {cycle.cycle_number} · Plazo {cycle.due_date} ·{" "}
          {cycle.first_submitted_at
            ? "Entrega registrada"
            : "Entrega pendiente"}
        </p>
      )}
      {deliverable.current_version_id && allowed("download") && (
        <div className="flex flex-wrap gap-3">
          <DownloadControl versionId={deliverable.current_version_id} />
        </div>
      )}
      {summary.disposition === "active" &&
        cycle &&
        specs &&
        deliverable.review_state !== "aprobado" &&
        allowed("upload") && (
          <UploadControl
            cycle={cycle}
            deliverable={deliverable}
            key={`${cycle.id}:${deliverable.revision}`}
            recovery={recovery}
            specs={specs}
          />
        )}
      {summary.disposition === "active" && (
        <ReviewControls deliverable={deliverable} summary={summary} />
      )}
    </article>
  );
}

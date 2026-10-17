"use client";
import { canPerform } from "@/domain/access/utils/permissions";
import { wasSubmittedOnTime } from "@/domain/documents/utils/document-status";
import { formatLimaDateTime } from "@/domain/time/utils/instant";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { DownloadControl } from "@/features/documents/components/download-control";
import type { VersionRowProps } from "@/features/documents/types/document-ui.types";

export function VersionRow({ version, summary }: VersionRowProps) {
  const { context } = useWorkspace();
  const moment = formatLimaDateTime(version.finalized_at);
  const timely = wasSubmittedOnTime(version.cycle);
  const download = canPerform(
    context.capabilities,
    summary.company_id,
    summary.module,
    "download",
    context.member.member_type,
  );
  return (
    <article className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="font-medium">
        {version.label} · Versión {version.version_number}
      </h3>
      <p className="break-all text-sm text-zinc-600">
        {version.original_name} ·{" "}
        {(version.validated_bytes / 1000).toLocaleString("es-PE")} KB
      </p>
      <p className="text-xs leading-5 text-zinc-600">
        {version.uploader_name ?? "Usuario histórico"} ·{" "}
        {moment.ok ? moment.data : version.finalized_at} · Lima
      </p>
      <p className="text-sm text-zinc-600">
        Ciclo {version.cycle.cycle_number} · Plazo {version.cycle.due_date} ·{" "}
        {timely === null
          ? "Sin recepción"
          : timely
            ? "Entrega puntual del ciclo"
            : "Entrega tardía del ciclo"}
      </p>
      {version.reviews.map((review) => (
        <div
          className="border-l-2 border-zinc-200 pl-3 text-sm text-zinc-600"
          key={review.id}
        >
          <p>
            {review.decision === "approve"
              ? "Aprobado"
              : review.decision === "observe"
                ? "Observado"
                : "Reabierto"}{" "}
            por {review.reviewer_name ?? "Revisor histórico"}
          </p>
          {review.comment && (
            <p className="mt-1 whitespace-pre-wrap">{review.comment}</p>
          )}
          {review.new_due_date && (
            <p className="mt-1">Nuevo plazo: {review.new_due_date}</p>
          )}
        </div>
      ))}
      {download && (
        <div className="flex flex-wrap gap-3">
          <DownloadControl versionId={version.id} />
          {["pdf", "jpg", "jpeg", "png"].includes(version.extension) && (
            <DownloadControl preview versionId={version.id} />
          )}
        </div>
      )}
    </article>
  );
}

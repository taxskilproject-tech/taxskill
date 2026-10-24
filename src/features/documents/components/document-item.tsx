"use client";
import Link from "next/link";

import { canPerform } from "@/domain/access/utils/permissions";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { DownloadControl } from "@/features/documents/components/download-control";
import type { DocumentItemProps } from "@/features/documents/types/document-ui.types";

export function DocumentItem({
  document,
  origin = "/documentos",
  allowActions = true,
}: DocumentItemProps) {
  const { context } = useWorkspace();
  const allowed = canPerform(
    context.capabilities,
    document.company_id,
    document.module,
    "download",
    context.member.member_type,
  );
  return (
    <article className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-3">
      <div>
        <p className="text-xs text-zinc-500">
          {document.company_name ?? "Interna del estudio"} · Versión{" "}
          {document.version_number}
        </p>
        <h2 className="mt-1 break-words font-semibold">
          {document.original_name}
        </h2>
        {allowActions && (
          <Link
            className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
            href={`/actividades/${document.obligation_id}?returnTo=${encodeURIComponent(origin)}`}
          >
            {document.title} →
          </Link>
        )}
      </div>
      {allowed && allowActions && (
        <div className="flex flex-wrap gap-3">
          <DownloadControl versionId={document.id} />
          {["pdf", "jpg", "jpeg", "png"].includes(document.extension) && (
            <DownloadControl preview versionId={document.id} />
          )}
        </div>
      )}
    </article>
  );
}

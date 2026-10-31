"use client";
import { useEffect, useRef } from "react";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { success } from "@/domain/common/utils/operation-result";
import { SUNAT_FILE_LIMIT } from "@/domain/sunat/constants/sunat";
import { useAction } from "@/features/access/hooks/use-action";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { saveBlob } from "@/lib/files/save-blob";

import {
  commandSunat,
  prepareSunatDownload,
  waitForSunatJob,
} from "../repositories/sunat.repository";
import type { SunatAttachmentProps } from "../types/ui.types";

export function SunatAttachmentControl({
  companyId,
  attachment,
  onChanged,
}: SunatAttachmentProps) {
  const { context } = useWorkspace();
  const action = useAction<null>();
  const requestId = useRef(crypto.randomUUID());
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function download() {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    try {
      await action.run(async () => {
        if (attachment.state !== "cached") {
          const response = await commandSunat(
            context.organization.id,
            requestId.current,
            "RequestAttachment",
            {
              company_id: companyId,
              attachment_id: attachment.id,
            },
          );
          if (!response.ok) return response;
          requestId.current = crypto.randomUUID();
          const completed = await waitForSunatJob(response.data, abort.signal);
          if (!completed.ok) return completed;
        }
        const signed = await prepareSunatDownload(
          context.organization.id,
          attachment.id,
        );
        if (!signed.ok) return signed;
        const file = await fetch(signed.data.url, {
          cache: "no-store",
          signal: abort.signal,
          redirect: "error",
        });
        if (!file.ok) throw { code: "DEPENDENCY_UNAVAILABLE" };
        const blob = await file.blob();
        if (blob.size > SUNAT_FILE_LIMIT) throw { code: "FILE_TOO_LARGE" };
        abort.signal.throwIfAborted();
        saveBlob(blob, signed.data.filename);
        return success(null);
      });
    } finally {
      controller.current = null;
      onChanged();
    }
  }
  return (
    <li className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="min-w-0 break-all text-sm">{attachment.filename}</span>
        <Button
          variant="secondary"
          loading={action.busy}
          loadingText="Preparando y descargando…"
          onClick={() => {
            void download();
          }}
        >
          Descargar
        </Button>
      </div>
      {action.error && (
        <FeedbackMessage kind="error">{action.error}</FeedbackMessage>
      )}
    </li>
  );
}

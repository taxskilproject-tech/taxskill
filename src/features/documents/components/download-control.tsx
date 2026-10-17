"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { success } from "@/domain/common/utils/operation-result";
import { signedDownloadSchema } from "@/domain/documents/contracts/document.schema";
import { useAction } from "@/features/access/hooks/use-action";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { FilePreview } from "@/features/documents/components/file-preview";
import { invokeDocumentEdge } from "@/features/documents/repositories/document.repository";
import type { DownloadProps } from "@/features/documents/types/document-ui.types";
import type { PreviewFile } from "@/features/documents/types/preview.types";

export function DownloadControl({ versionId, preview = false }: DownloadProps) {
  const action = useAction<null>();
  const { context } = useWorkspace();
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewReady = useCallback(() => setPreviewLoading(false), []);
  const controller = useRef<AbortController | null>(null);
  const objectUrl = useRef("");
  useEffect(
    () => () => {
      controller.current?.abort();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );
  function closePreview() {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = "";
    setPreviewFile(null);
    setPreviewLoading(false);
  }
  async function openFile() {
    await action.run(async () => {
      const current = new AbortController();
      controller.current = current;
      const signed = await invokeDocumentEdge(
        {
          action: "download",
          organization_id: context.organization.id,
          version_id: versionId,
          request_id: crypto.randomUUID(),
        },
        signedDownloadSchema,
        current.signal,
      );
      const response = await fetch(signed.url, {
        signal: current.signal,
        cache: "no-store",
      });
      if (!response.ok) throw { code: "DEPENDENCY_UNAVAILABLE" };
      const blob = await response.blob();
      current.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      if (preview) {
        closePreview();
        objectUrl.current = url;
        setPreviewLoading(true);
        setPreviewFile({
          url,
          extension: signed.extension,
          name: signed.original_name,
        });
        return success(null);
      }
      const link = document.createElement("a");
      link.href = url;
      link.download = signed.original_name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return success(null);
    });
  }
  return (
    <div className={previewFile ? "w-full space-y-3" : "space-y-3"}>
      <Button
        loading={action.busy || previewLoading}
        loadingText={preview ? "Preparando vista…" : "Descargando archivo…"}
        onClick={() => {
          void openFile();
        }}
        variant="secondary"
      >
        {preview ? "Vista previa" : "Descargar"}
      </Button>
      {action.error && (
        <FeedbackMessage kind="error">{action.error}</FeedbackMessage>
      )}
      {previewFile && (
        <div className="space-y-2 rounded-lg border border-zinc-200 p-3">
          <Button onClick={closePreview} variant="secondary">
            Cerrar vista previa
          </Button>
          <FilePreview
            file={previewFile}
            key={previewFile.url}
            onReady={previewReady}
          />
        </div>
      )}
    </div>
  );
}

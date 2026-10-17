"use client";
import { useRef } from "react";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { usePdfPreview } from "@/features/documents/hooks/use-pdf-preview";
import type { PdfPreviewProps } from "@/features/documents/types/preview.types";

export function PdfPreview({ url, name, onReady }: PdfPreviewProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewer = usePdfPreview(url, onReady, canvas);
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-600" role="status">
        {viewer.busy
          ? "Preparando página del PDF…"
          : `Página ${viewer.page} de ${viewer.pages}`}
      </p>
      {viewer.error && (
        <FeedbackMessage kind="error">{viewer.error}</FeedbackMessage>
      )}
      <canvas
        aria-label={`Vista de ${name}, página ${viewer.page}`}
        className="h-auto w-full rounded-lg border border-zinc-200 bg-white"
        ref={canvas}
      >
        Vista de la página {viewer.page}. Usa Descargar para acceder al
        documento original.
      </canvas>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={viewer.busy || viewer.page <= 1}
          loading={viewer.busy && viewer.pendingPage === viewer.page - 1}
          loadingText="Preparando página…"
          onClick={() => {
            void viewer.goTo(viewer.page - 1);
          }}
          variant="secondary"
        >
          Página anterior
        </Button>
        <Button
          disabled={viewer.busy || viewer.page >= viewer.pages}
          loading={viewer.busy && viewer.pendingPage === viewer.page + 1}
          loadingText="Preparando página…"
          onClick={() => {
            void viewer.goTo(viewer.page + 1);
          }}
          variant="secondary"
        >
          Página siguiente
        </Button>
      </div>
    </div>
  );
}

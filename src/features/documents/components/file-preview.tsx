"use client";
import Image from "next/image";
import { useState } from "react";

import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { PdfPreview } from "@/features/documents/components/pdf-preview";
import type { FilePreviewProps } from "@/features/documents/types/preview.types";

export function FilePreview({ file, onReady }: FilePreviewProps) {
  const [failed, setFailed] = useState(false);
  if (file.extension === "pdf")
    return <PdfPreview name={file.name} onReady={onReady} url={file.url} />;
  if (failed)
    return (
      <FeedbackMessage kind="error">
        No se pudo mostrar esta imagen. Puedes descargarla para revisarla.
      </FeedbackMessage>
    );
  return (
    <Image
      alt={`Vista previa de ${file.name}`}
      className="max-h-[70dvh] w-full object-contain"
      height={800}
      onLoad={onReady}
      onError={() => {
        setFailed(true);
        onReady();
      }}
      src={file.url}
      unoptimized
      width={1000}
    />
  );
}

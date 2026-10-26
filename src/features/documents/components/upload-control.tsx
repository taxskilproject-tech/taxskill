"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { useUpload } from "@/features/documents/hooks/use-upload";
import type { UploadControlProps } from "@/features/documents/types/document-ui.types";

export function UploadControl(props: UploadControlProps) {
  const [file, setFile] = useState<File | null>(null);
  const [startNew, setStartNew] = useState(false);
  const upload = useUpload({
    ...props,
    recovery: startNew ? undefined : props.recovery,
  });
  const { specs } = props;
  const recovery = startNew ? undefined : props.recovery;
  const invalid =
    file &&
    (file.size > specs.max_file_bytes ||
      !specs.allowed_formats.some(
        (format) => format === file.name.split(".").at(-1)?.toLowerCase(),
      ));
  const loadingText =
    upload.progress.phase === "uploading"
      ? `Transfiriendo ${upload.progress.percent}%…`
      : upload.progress.phase === "validating"
        ? "Validando y confirmando…"
        : "Preparando carga…";
  return (
    <section className="space-y-3 border-t border-zinc-100 pt-4">
      <Label htmlFor={`file-${props.deliverable.id}`}>
        Archivo para {props.deliverable.label}
      </Label>
      <Input
        accept={specs.allowed_formats.map((format) => `.${format}`).join(",")}
        disabled={upload.busy}
        id={`file-${props.deliverable.id}`}
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null);
          upload.resetIntent();
        }}
        type="file"
      />
      <p className="text-xs leading-5 text-zinc-600">
        {specs.allowed_formats.join(", ").toUpperCase()} · Máximo{" "}
        {(specs.max_file_bytes / 1_000_000).toLocaleString("es-PE")} MB. La
        entrega cuenta al terminar la validación.
      </p>
      {recovery && (
        <p className="text-sm text-zinc-600">
          Carga recuperable: {recovery.original_name}. Puedes confirmar lo
          recibido o seleccionar el mismo archivo para reanudar la
          transferencia.
        </p>
      )}
      {recovery && (
        <Button
          disabled={upload.busy}
          onClick={() => {
            setStartNew(true);
            upload.resetIntent();
          }}
          variant="secondary"
        >
          Empezar otra entrega
        </Button>
      )}
      {invalid && (
        <FeedbackMessage kind="error">
          El formato o tamaño del archivo no cumple los límites de este archivo
          requerido.
        </FeedbackMessage>
      )}
      {upload.busy && upload.progress.phase === "uploading" && (
        <progress
          aria-label="Progreso de transferencia"
          className="h-2 w-full accent-zinc-900"
          max={100}
          value={upload.progress.percent}
        />
      )}
      {upload.error && (
        <FeedbackMessage kind="error">{upload.error}</FeedbackMessage>
      )}
      {upload.progress.phase === "ready" && (
        <FeedbackMessage kind="success">
          Entrega validada y registrada. Pendiente de revisión.
        </FeedbackMessage>
      )}
      <Button
        disabled={Boolean(invalid) || (!file && !recovery)}
        loading={upload.busy}
        loadingText={loadingText}
        onClick={() => {
          void upload.upload(file);
        }}
      >
        {recovery ? "Reanudar o confirmar carga" : "Entregar archivo"}
      </Button>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import type { FormActionProps } from "@/features/access/types/access-ui.types";

export function FormActions({
  busy,
  error,
  success,
  label = "Guardar cambios",
  loadingText = "Guardando cambios…",
  onCancel,
  disabled = false,
}: FormActionProps) {
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) feedback.current?.focus();
  }, [error]);
  return (
    <div className="sticky bottom-0 z-10 space-y-3 border-t border-zinc-200 bg-white py-3">
      {error && (
        <div ref={feedback} tabIndex={-1}>
          <FeedbackMessage kind="error">{error}</FeedbackMessage>
        </div>
      )}
      {success && <FeedbackMessage kind="success">{success}</FeedbackMessage>}
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={disabled}
          loading={busy}
          loadingText={loadingText}
          type="submit"
        >
          {label}
        </Button>
        {onCancel && (
          <Button disabled={busy} onClick={onCancel} variant="secondary">
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}

"use client";
import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { DIGEST_STATUS_LABELS } from "@/domain/notifications/constants/notifications";
import { useDocumentCommand } from "@/features/documents/hooks/use-document-command";
import { AttemptHistory } from "@/features/notifications/components/attempt-history";
import type { DigestCardProps } from "@/features/notifications/types/notification-ui.types";

export function DigestCard({ digest }: DigestCardProps) {
  const command = useDocumentCommand();
  return (
    <article className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <h3 className="font-semibold">
          {digest.recipient_name} · {digest.local_date}
        </h3>
        <span className="text-sm">
          {digest.expired_at
            ? "Pendiente caducado"
            : DIGEST_STATUS_LABELS[digest.status]}
        </span>
      </div>
      <p className="text-sm text-zinc-600">
        {digest.http_attempt_count} / 3 intentos HTTP. La aceptación del webhook
        no confirma entrega.
      </p>
      {digest.last_error_code && (
        <p className="text-sm text-zinc-600">
          Incidencia: {digest.last_error_code}
        </p>
      )}
      {digest.needs_provider_reconciliation && (
        <p className="text-sm text-zinc-600">
          El envío se reservó, pero falta evidencia del resultado. Consulta al
          proveedor antes de autorizar cualquier nuevo envío.
        </p>
      )}
      {digest.has_receipt && !["sent", "delivered"].includes(digest.status) && (
        <Button
          loading={command.busy}
          loadingText="Conciliando evidencia…"
          onClick={() => {
            void command.submit("ReconcileDigest", {
              digest_id: digest.id,
              expected_revision: digest.revision,
            });
          }}
          variant="secondary"
        >
          Conciliar evidencia guardada
        </Button>
      )}
      {command.error && (
        <FeedbackMessage kind="error">{command.error}</FeedbackMessage>
      )}
      <AttemptHistory digestId={digest.id} />
    </article>
  );
}

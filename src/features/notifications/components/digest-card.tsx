"use client";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { RecordInspector } from "@/components/organisms/record-inspector";
import { DIGEST_STATUS_LABELS } from "@/domain/notifications/constants/notifications";
import { useDocumentCommand } from "@/features/documents/hooks/use-document-command";
import { AttemptHistory } from "@/features/notifications/components/attempt-history";
import type { DigestCardProps } from "@/features/notifications/types/notification-ui.types";
import { digestErrorLabel } from "@/features/notifications/utils/digest-error-label";

export function DigestCard({ digest }: DigestCardProps) {
  const command = useDocumentCommand();
  return (
    <article className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1">
      <div className="min-w-0">
        <div className="flex flex-wrap justify-between gap-3">
          <h3 className="font-semibold">
            {digest.recipient_name} · {digest.local_date}
          </h3>
          <Badge
            tone={
              digest.status === "delivered"
                ? "success"
                : digest.last_error_code
                  ? "danger"
                  : "blue"
            }
          >
            {digest.expired_at
              ? "Pendiente caducado"
              : DIGEST_STATUS_LABELS[digest.status]}
          </Badge>
        </div>
      </div>
      <RecordInspector
        title={`${digest.recipient_name} · ${digest.local_date}`}
        label="Ver envío"
      >
        <p className="text-sm text-zinc-600">
          {digest.http_attempt_count} / 3 intentos HTTP. La aceptación del
          webhook no confirma entrega.
        </p>
        {digest.last_error_code && (
          <p className="text-sm text-zinc-600">
            {digestErrorLabel(digest.last_error_code)}
            <span className="block text-xs">
              Código: {digest.last_error_code}
            </span>
          </p>
        )}
        {digest.needs_provider_reconciliation && (
          <p className="text-sm text-zinc-600">
            El envío se reservó, pero falta evidencia del resultado. Consulta al
            proveedor antes de autorizar cualquier nuevo envío.
          </p>
        )}
        {digest.has_receipt &&
          !["sent", "delivered"].includes(digest.status) && (
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
      </RecordInspector>
    </article>
  );
}

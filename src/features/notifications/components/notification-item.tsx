"use client";
import Link from "next/link";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { formatLimaDateTime } from "@/domain/time/utils/instant";
import { useDocumentCommand } from "@/features/documents/hooks/use-document-command";
import type { NotificationItemProps } from "@/features/notifications/types/notification-ui.types";

export function NotificationItem({
  notification,
  origin,
}: NotificationItemProps) {
  const command = useDocumentCommand();
  const formatted = formatLimaDateTime(notification.created_at);
  const target = notification.obligation_id
    ? `/actividades/${notification.obligation_id}?returnTo=${encodeURIComponent(origin)}`
    : "/configuracion?tab=whatsapp";
  return (
    <article className="space-y-1 rounded-lg border border-zinc-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-semibold">{notification.title}</h2>
        <span className="text-xs text-zinc-500">
          {notification.read_at ? "Leída" : "Sin leer"} ·{" "}
          {formatted.ok ? formatted.data : "Fecha no disponible"}
        </span>
      </div>
      <p className="text-sm text-zinc-600">{notification.body}</p>
      <div className="flex flex-wrap items-center gap-4">
        <Link
          className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          href={target}
        >
          Abrir {notification.obligation_id ? "actividad" : "seguimiento"} →
        </Link>
        {!notification.read_at && (
          <Button
            loading={command.busy}
            loadingText="Marcando como leída…"
            onClick={() => {
              void command.submit("MarkNotificationRead", {
                notification_id: notification.id,
              });
            }}
            variant="secondary"
          >
            Marcar como leída
          </Button>
        )}
      </div>
      {command.error && (
        <FeedbackMessage kind="error">{command.error}</FeedbackMessage>
      )}
    </article>
  );
}

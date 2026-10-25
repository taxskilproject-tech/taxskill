"use client";
import Link from "next/link";

import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
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
    <article
      data-notification-id={notification.id}
      className={`rounded-lg border px-3 py-1 ${notification.read_at ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50/40"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <Link
            aria-label={`Abrir ${notification.obligation_id ? "actividad" : "seguimiento"}: ${notification.title}`}
            className="block min-h-11 py-1 text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600"
            href={target}
          >
            <h2 className="font-semibold">{notification.title}</h2>
            <p className="text-xs text-slate-600">{notification.body}</p>
          </Link>
          <p className="text-xs text-slate-600">
            {notification.read_at ? "Leída" : "Sin leer"} ·{" "}
            {formatted.ok ? formatted.data : "Fecha no disponible"}
          </p>
        </div>
        {!notification.read_at && (
          <Button
            aria-label="Marcar como leída"
            title="Marcar como leída"
            loading={command.busy}
            loadingText="Marcando…"
            onClick={() => {
              void command.submit("MarkNotificationRead", {
                notification_id: notification.id,
              });
            }}
            variant="secondary"
            className="shrink-0 px-2"
          >
            <Icon name="check" />
          </Button>
        )}
      </div>
      {command.error && (
        <FeedbackMessage kind="error">{command.error}</FeedbackMessage>
      )}
    </article>
  );
}

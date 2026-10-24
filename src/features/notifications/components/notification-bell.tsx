"use client";
import Link from "next/link";

import { notificationCountSchema } from "@/domain/notifications/contracts/notification.schema";
import { useActivityQuery } from "@/features/activities/hooks/use-activity-query";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { useNotificationRealtime } from "@/features/notifications/hooks/use-notification-realtime";

export function NotificationBell() {
  const { company } = useWorkspace();
  const query = useActivityQuery(
    "unread_count",
    {
      company_id: company.kind === "company" ? company.companyId : undefined,
      scope: company.kind === "internal" ? "internal" : "all",
    },
    notificationCountSchema,
  );
  const realtimeError = useNotificationRealtime();
  return (
    <div className="shrink-0 text-sm">
      <Link
        className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg px-3 underline-offset-4 hover:underline focus-visible:outline-2"
        href="/notificaciones"
      >
        <svg
          aria-hidden="true"
          className="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        <span className="sr-only">Notificaciones</span>
        <span aria-atomic="true" role="status">
          {query.data
            ? `${query.data.unread_count} sin leer`
            : query.error
              ? "No disponibles"
              : "Consultando avisos"}
        </span>
      </Link>
      {realtimeError && (
        <p className="text-xs text-zinc-600" role="status">
          {realtimeError}
        </p>
      )}
    </div>
  );
}

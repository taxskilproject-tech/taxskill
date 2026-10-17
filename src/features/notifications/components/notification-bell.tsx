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
    <div className="w-full text-sm sm:w-auto sm:max-w-xs">
      <Link
        className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg px-3 underline-offset-4 hover:underline focus-visible:outline-2"
        href="/notificaciones"
      >
        Notificaciones{" "}
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

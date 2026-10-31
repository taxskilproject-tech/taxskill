"use client";
import Link from "next/link";

import { notificationCountSchema } from "@/domain/notifications/contracts/notification.schema";
import { sunatAlertsSchema } from "@/domain/sunat/contracts/sunat.schema";
import { canReadSunat } from "@/domain/sunat/utils/access";
import { useActivityQuery } from "@/features/activities/hooks/use-activity-query";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { useNotificationRealtime } from "@/features/notifications/hooks/use-notification-realtime";
import { useSunatQuery } from "@/features/sunat-mailbox/hooks/use-sunat-query";

export function NotificationBell() {
  const { company, context } = useWorkspace();
  const mailboxEnabled = canReadSunat(context);
  const mailbox = useSunatQuery(
    "alert_count",
    { company_id: company.kind === "company" ? company.companyId : undefined },
    sunatAlertsSchema,
    mailboxEnabled,
    30000,
  );
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
            ? `${query.data.unread_count + (mailboxEnabled ? (mailbox.data?.count ?? 0) : 0)} sin leer`
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
      {mailboxEnabled && mailbox.error && (
        <p role="status" className="text-xs text-red-700">
          Avisos SUNAT no disponibles.
        </p>
      )}
    </div>
  );
}

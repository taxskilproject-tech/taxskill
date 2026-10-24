"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/atoms/button";
import { SectionNavigation } from "@/components/molecules/section-navigation";
import { notificationListSchema } from "@/domain/notifications/contracts/notification.schema";
import { PageHeading } from "@/features/access/components/page-heading";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { useCurrentRoute } from "@/features/access/hooks/use-current-route";
import { useActivityQuery } from "@/features/activities/hooks/use-activity-query";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { NotificationItem } from "@/features/notifications/components/notification-item";

export function NotificationsPage() {
  const { company } = useWorkspace();
  const parameters = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const parsedPage = Number(parameters.get("page") ?? 1);
  const page =
    Number.isInteger(parsedPage) && parsedPage >= 1 && parsedPage <= 100000
      ? parsedPage
      : 1;
  const unread = parameters.get("unread") === "true";
  const query = useActivityQuery(
    "notifications",
    {
      page,
      unread_only: unread,
      company_id: company.kind === "company" ? company.companyId : undefined,
      scope: company.kind === "internal" ? "internal" : "all",
    },
    notificationListSchema,
  );
  const origin = useCurrentRoute();
  return (
    <div className="space-y-5">
      <PageHeading
        action={
          <Button
            loading={query.isFetching}
            loadingText="Actualizando avisos…"
            onClick={() => {
              void query.refetch();
            }}
            variant="secondary"
          >
            Actualizar avisos
          </Button>
        }
        description="Avisos personales de tus alcances actuales. Leerlos no completa las actividades."
        title="Notificaciones"
      />
      <SectionNavigation
        label="Bandeja de notificaciones"
        selected={unread ? "unread" : "all"}
        items={[
          { id: "all", label: "Todas" },
          { id: "unread", label: "Sin leer" },
        ]}
        onSelect={(value) =>
          router.replace(`${pathname}?page=1&unread=${value === "unread"}`, {
            scroll: false,
          })
        }
      />
      <QueryState
        error={query.error}
        loading={query.isPending}
        onRetry={() => {
          void query.refetch();
        }}
        retrying={query.isFetching}
      >
        <Pagination
          count={query.data?.count ?? 0}
          onPage={(value) =>
            router.replace(`${pathname}?page=${value}&unread=${unread}`, {
              scroll: false,
            })
          }
          page={page}
        />
        {query.data?.rows.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            origin={origin}
          />
        ))}
        {query.data?.count === 0 && (
          <p className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
            No tienes avisos en este contexto.
          </p>
        )}
        <Pagination
          count={query.data?.count ?? 0}
          onPage={(value) =>
            router.replace(`${pathname}?page=${value}&unread=${unread}`, {
              scroll: false,
            })
          }
          page={page}
        />
      </QueryState>
    </div>
  );
}

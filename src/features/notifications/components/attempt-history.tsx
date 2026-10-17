"use client";
import { useState } from "react";

import { attemptListSchema } from "@/domain/notifications/contracts/notification.schema";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { useActivityQuery } from "@/features/activities/hooks/use-activity-query";
import type { AttemptHistoryProps } from "@/features/notifications/types/notification-ui.types";

export function AttemptHistory({ digestId }: AttemptHistoryProps) {
  const [page, setPage] = useState(1);
  const [opened, setOpened] = useState(false);
  const query = useActivityQuery(
    "attempts",
    { digest_id: digestId, page },
    attemptListSchema,
    opened,
  );
  return (
    <details onToggle={(event) => setOpened(event.currentTarget.open)}>
      <summary className="cursor-pointer text-sm font-medium">
        Intentos y confirmaciones
      </summary>
      {opened && (
        <div className="mt-3 space-y-3">
          <QueryState
            error={query.error}
            loading={query.isPending}
            onRetry={() => {
              void query.refetch();
            }}
            retrying={query.isFetching}
          >
            {query.data?.rows.map((attempt) => (
              <p
                className="rounded-lg border border-zinc-200 p-3 text-sm text-zinc-600"
                key={attempt.id}
              >
                {attempt.direction === "callback"
                  ? "Confirmación del proveedor"
                  : `Intento HTTP ${attempt.attempt_number}`}{" "}
                ·{" "}
                {attempt.result.phase === "reserved"
                  ? "Reservado antes del envío"
                  : (attempt.provider_status ??
                    attempt.http_status ??
                    attempt.result.transport_outcome ??
                    "Resultado registrado")}
                {attempt.error_code ? ` · ${attempt.error_code}` : ""}
              </p>
            ))}
            <Pagination
              count={query.data?.count ?? 0}
              onPage={setPage}
              page={page}
            />
          </QueryState>
        </div>
      )}
    </details>
  );
}

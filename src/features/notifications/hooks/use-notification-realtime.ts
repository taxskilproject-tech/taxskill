"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { requireBrowserClient } from "@/features/access/repositories/access.repository";
import { useWorkspace } from "@/features/auth/providers/workspace-context";

export function useNotificationRealtime() {
  const { context, company } = useWorkspace();
  const cache = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const scope = company.kind === "company" ? company.companyId : company.kind;
  useEffect(() => {
    const client = requireBrowserClient();
    const channel = client
      .channel(
        `personal-notices:${context.organization.id}:${context.profile.user_id}`,
      )
      .on("broadcast", { event: "changed" }, () => {
        void cache.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes("activities:notifications") ||
            query.queryKey.includes("activities:unread_count"),
        });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setError(null);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          setError(
            "Los avisos en tiempo real no están disponibles. Puedes actualizar el centro de notificaciones.",
          );
      });
    return () => {
      void client
        .removeChannel(channel)
        .then((status) => {
          if (status !== "ok")
            console.error(
              "No se pudo cerrar correctamente el canal de avisos.",
            );
        })
        .catch(() => console.error("Falló el cierre del canal de avisos."));
    };
  }, [cache, context.organization.id, context.profile.user_id, scope]);
  return error;
}

"use client";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { ResourceState } from "@/components/organisms/resource-state";
import { SidePanel } from "@/components/organisms/side-panel";
import { QueryState } from "@/features/access/components/query-state";
import { loadUser } from "@/features/access/repositories/access.repository";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { UserDetail } from "@/features/users/components/user-detail";
import type { UserManagementProps } from "@/features/users/types/user-list.types";
import { useDataScope } from "@/lib/query/hooks/use-data-scope";
import { createScopedQueryKey } from "@/lib/query/utils/query-keys";

export function UserManagementPanel({
  memberId,
  directory,
  onClose,
  onChanged,
}: UserManagementProps) {
  const { context } = useWorkspace();
  const scope = useDataScope();
  const valid = z.uuid().safeParse(memberId).success;
  const query = useQuery({
    queryKey: createScopedQueryKey(scope!, "member-detail", { memberId }),
    queryFn: ({ signal }) =>
      loadUser(context.organization.id, memberId, signal),
    enabled: valid && context.member.is_admin,
  });
  function changed() {
    onChanged();
    void query.refetch();
  }
  return (
    <SidePanel
      title={query.data?.profile.full_name ?? "Gestión del usuario"}
      onClose={onClose}
      wide
    >
      <QueryState
        error={query.error}
        loading={valid && query.isPending}
        onRetry={() => {
          void query.refetch();
        }}
        retrying={query.isFetching}
      >
        {query.data ? (
          <UserDetail
            user={query.data}
            directory={directory}
            onChanged={changed}
            key={query.data.member.id}
          />
        ) : (
          <ResourceState
            title="Usuario no encontrado"
            description="La cuenta no existe o no está disponible en este estudio."
            kind="not-found"
          />
        )}
      </QueryState>
    </SidePanel>
  );
}

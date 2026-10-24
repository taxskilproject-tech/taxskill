"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { ResourceState } from "@/components/organisms/resource-state";
import { SidePanel } from "@/components/organisms/side-panel";
import { ListToolbar } from "@/features/access/components/list-toolbar";
import { PageHeading } from "@/features/access/components/page-heading";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { useDirectoryFilters } from "@/features/access/hooks/use-directory-filters";
import { usePresentation } from "@/features/access/hooks/use-presentation";
import {
  listUsers,
  loadDirectory,
} from "@/features/access/repositories/access.repository";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { OperationsPanel } from "@/features/users/components/operations-panel";
import { UserForm } from "@/features/users/components/user-form";
import { UserList } from "@/features/users/components/user-list";
import { UserManagementPanel } from "@/features/users/components/user-management-panel";
import { useDataScope } from "@/lib/query/hooks/use-data-scope";
import { createScopedQueryKey } from "@/lib/query/utils/query-keys";

export function UsersPage() {
  const { context } = useWorkspace();
  const scope = useDataScope();
  const [filter, setFilter] = useDirectoryFilters();
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = usePresentation("memberId", "");
  const directory = useQuery({
    queryKey: createScopedQueryKey(scope!, "directory"),
    queryFn: ({ signal }) => loadDirectory(context.organization.id, signal),
    enabled: context.member.is_admin,
  });
  const users = useQuery({
    queryKey: createScopedQueryKey(scope!, "users", { ...filter }),
    queryFn: ({ signal }) => listUsers(context.organization.id, filter, signal),
    enabled: context.member.is_admin,
  });
  if (!context.member.is_admin)
    return (
      <ResourceState
        description="Solo el administrador gestiona las cuentas del estudio."
        kind="forbidden"
        title="Acceso restringido"
      />
    );
  function changed() {
    setCreating(false);
    void directory.refetch();
    void users.refetch();
  }
  return (
    <div className="space-y-6">
      <PageHeading
        action={
          <Button
            onClick={() => {
              setCreating(true);
              setSelected("");
            }}
          >
            Nuevo usuario
          </Button>
        }
        description="Cuentas, membresías y permisos de acceso del estudio."
        title="Usuarios"
      />
      {creating && directory.data && (
        <SidePanel title="Nuevo usuario" onClose={() => setCreating(false)}>
          <UserForm
            directory={directory.data}
            onCancel={() => setCreating(false)}
            onSaved={changed}
          />
        </SidePanel>
      )}
      <ListToolbar
        allowDeleted
        deleted={filter.deleted}
        onDeleted={(deleted) => {
          setFilter({ ...filter, page: 1, deleted });
        }}
        onQuery={(query) => {
          setFilter({ ...filter, page: 1, query });
        }}
        query={filter.query}
      />
      <QueryState
        error={users.error ?? directory.error}
        loading={users.isPending || directory.isPending}
        onRetry={changed}
        retrying={users.isFetching || directory.isFetching}
      >
        <Pagination
          count={users.data?.count ?? 0}
          onPage={(page) => {
            setFilter({ ...filter, page });
          }}
          page={filter.page}
        />
        <UserList
          users={users.data?.rows ?? []}
          selected={selected}
          onSelect={(id) => {
            setCreating(false);
            setSelected(id);
          }}
        />
        {!users.data?.rows.length && (
          <ResourceState
            description="Prueba otros filtros o crea una cuenta."
            kind="empty"
            title="Sin usuarios en esta consulta"
          />
        )}
        <Pagination
          count={users.data?.count ?? 0}
          onPage={(page) => {
            setFilter({ ...filter, page });
          }}
          page={filter.page}
        />
        {selected && directory.data && (
          <UserManagementPanel
            memberId={selected}
            directory={directory.data}
            onClose={() => setSelected("")}
            onChanged={changed}
          />
        )}
      </QueryState>
      <OperationsPanel />
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { ResourceState } from "@/components/organisms/resource-state";
import { ListToolbar } from "@/features/access/components/list-toolbar";
import { PageHeading } from "@/features/access/components/page-heading";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import {
  listUsers,
  loadDirectory,
} from "@/features/access/repositories/access.repository";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { OperationsPanel } from "@/features/users/components/operations-panel";
import { UserDetail } from "@/features/users/components/user-detail";
import { UserForm } from "@/features/users/components/user-form";
import { useDataScope } from "@/lib/query/hooks/use-data-scope";
import { createScopedQueryKey } from "@/lib/query/utils/query-keys";

export function UsersPage() {
  const { context } = useWorkspace();
  const scope = useDataScope();
  const [filter, setFilter] = useState({ page: 1, query: "", deleted: false });
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const directory = useQuery({
    queryKey: createScopedQueryKey(scope!, "directory"),
    queryFn: ({ signal }) => loadDirectory(context.organization.id, signal),
    enabled: context.member.is_admin,
  });
  const users = useQuery({
    queryKey: createScopedQueryKey(scope!, "users", filter),
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
  const selectedUser = users.data?.rows.find(
    (user) => user.member.id === selected,
  );
  return (
    <div className="space-y-6">
      <PageHeading
        action={
          <Button
            onClick={() => {
              setCreating(true);
              setSelected(null);
            }}
          >
            Nuevo usuario
          </Button>
        }
        description="Cuentas, membresías y permisos de acceso del estudio."
        title="Usuarios"
      />
      {creating && directory.data && (
        <UserForm
          directory={directory.data}
          onCancel={() => setCreating(false)}
          onSaved={changed}
        />
      )}
      <ListToolbar
        allowDeleted
        deleted={filter.deleted}
        onDeleted={(deleted) => {
          setSelected(null);
          setFilter({ ...filter, page: 1, deleted });
        }}
        onQuery={(query) => {
          setSelected(null);
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
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
          {users.data?.rows.map((user) => (
            <li
              className="flex flex-wrap items-center justify-between gap-4 p-5"
              key={user.member.id}
            >
              <div className="space-y-2">
                <p className="font-medium">{user.profile.full_name}</p>
                <p className="text-sm break-all text-zinc-500">
                  {user.profile.email}
                </p>
                <div className="flex gap-2">
                  <Badge>
                    {user.member.is_admin
                      ? "Administrador"
                      : user.member.member_type === "client"
                        ? "Cliente"
                        : "Equipo"}
                  </Badge>
                  <Badge>
                    {user.profile.deleted_at || user.member.deleted_at
                      ? "Eliminado"
                      : user.profile.enabled && user.member.active
                        ? "Habilitado"
                        : "Inhabilitado"}
                  </Badge>
                </div>
              </div>
              <Button
                aria-expanded={selected === user.member.id}
                onClick={() => {
                  setCreating(false);
                  setSelected(
                    selected === user.member.id ? null : user.member.id,
                  );
                }}
                variant="secondary"
              >
                {selected === user.member.id
                  ? "Cerrar detalle"
                  : "Gestionar acceso"}
              </Button>
            </li>
          ))}
        </ul>
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
            setSelected(null);
            setFilter({ ...filter, page });
          }}
          page={filter.page}
        />
        {selectedUser && directory.data && (
          <UserDetail
            directory={directory.data}
            key={selectedUser.member.id}
            onChanged={changed}
            user={selectedUser}
          />
        )}
      </QueryState>
      <OperationsPanel />
    </div>
  );
}

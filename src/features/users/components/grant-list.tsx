"use client";

import { useState } from "react";

import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import type { Grant } from "@/domain/access/types/access.types";
import { LifecycleControl } from "@/features/access/components/lifecycle-control";
import type { GrantListProps } from "@/features/access/types/access-ui.types";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { GrantForm } from "@/features/users/components/grant-form";

export function GrantList({
  user,
  directory,
  grants,
  overrides,
  onChanged,
}: GrantListProps) {
  const { context } = useWorkspace();
  const [editing, setEditing] = useState<Grant | "new" | null>(null);
  function saved() {
    setEditing(null);
    onChanged();
  }
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Accesos por empresa y módulo</h3>
        {!user.member.deleted_at && (
          <Button onClick={() => setEditing("new")} variant="secondary">
            Añadir asignación
          </Button>
        )}
      </div>
      {editing && (
        <GrantForm
          directory={directory}
          grant={editing === "new" ? undefined : editing}
          key={editing === "new" ? "new" : editing.id + editing.revision}
          onCancel={() => setEditing(null)}
          onSaved={saved}
          overrides={overrides}
          user={user}
        />
      )}
      {!grants.length && (
        <p className="text-sm text-zinc-500">
          Sin asignaciones. El usuario no tendrá empresas ni módulos
          disponibles.
        </p>
      )}
      <ul className="space-y-3">
        {grants.map((grant) => (
          <li
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-5"
            key={grant.id}
          >
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {grant.scope === "organization"
                  ? "Internas del estudio"
                  : (context.companies.find(
                      (item) => item.id === grant.company_id,
                    )?.legal_name ?? "Empresa fuera de operación")}
              </p>
              <p className="text-xs text-zinc-500">
                {grant.module} ·{" "}
                {directory.roles.find((role) => role.id === grant.role_id)
                  ?.name ?? "Rol no disponible"}
              </p>
              <Badge>
                {grant.deleted_at
                  ? "Eliminada"
                  : grant.active
                    ? "Activa"
                    : "Inactiva"}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {!grant.deleted_at && (
                <Button onClick={() => setEditing(grant)} variant="secondary">
                  Editar permisos
                </Button>
              )}
              <LifecycleControl
                deleted={Boolean(grant.deleted_at)}
                entity="access_grants"
                id={grant.id}
                onChanged={onChanged}
                revision={grant.revision}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

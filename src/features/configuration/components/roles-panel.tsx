"use client";

import { useState } from "react";

import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { SidePanel } from "@/components/organisms/side-panel";
import type { Role } from "@/domain/access/types/access.types";
import { LifecycleControl } from "@/features/access/components/lifecycle-control";
import { RoleForm } from "@/features/configuration/components/role-form";
import type { RolesPanelProps } from "@/features/configuration/types/configuration.types";

export function RolesPanel({ directory, onChanged }: RolesPanelProps) {
  const [editing, setEditing] = useState<Role | "new" | null>(null);
  function saved() {
    setEditing(null);
    onChanged();
  }
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Roles y acciones</h2>
        <Button onClick={() => setEditing("new")}>Nuevo rol</Button>
      </div>
      {editing && (
        <SidePanel title="Rol y permisos" onClose={() => setEditing(null)} wide>
          <RoleForm
            directory={directory}
            key={editing === "new" ? "new" : editing.id + editing.revision}
            onCancel={() => setEditing(null)}
            onSaved={saved}
            role={editing === "new" ? undefined : editing}
          />
        </SidePanel>
      )}
      <ul className="space-y-3">
        {directory.roles
          .filter((role) => !role.deleted_at)
          .map((role) => (
            <li
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-5"
              key={role.id}
            >
              <div className="space-y-2">
                <p className="font-medium">{role.name}</p>
                <p className="text-sm text-zinc-500">
                  {role.audience === "client" ? "Cliente" : "Equipo interno"} ·{" "}
                  {
                    directory.rolePermissions.filter(
                      (relation) =>
                        relation.role_id === role.id && !relation.deleted_at,
                    ).length
                  }{" "}
                  acciones
                </p>
                <Badge>{role.active ? "Activo" : "Inactivo"}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setEditing(role)} variant="secondary">
                  Editar rol
                </Button>
                <LifecycleControl
                  deleted={false}
                  entity="roles"
                  id={role.id}
                  onChanged={onChanged}
                  revision={role.revision}
                />
              </div>
            </li>
          ))}
      </ul>
    </section>
  );
}

"use client";
import { useState } from "react";

import { CheckboxField } from "@/components/molecules/checkbox-field";
import { SectionNavigation } from "@/components/molecules/section-navigation";
import { ACTION_LABELS } from "@/domain/access/constants/action-labels";
import { DOCUMENT_MODULES } from "@/domain/common/constants/modules";
import type { RolePermissionsProps } from "@/features/configuration/types/role-permissions.types";

export function RolePermissions({
  permissions,
  selected,
  busy,
}: RolePermissionsProps) {
  const [module, setModule] = useState<string>(DOCUMENT_MODULES[0].id);
  const [count, setCount] = useState(selected.size);
  return (
    <section className="space-y-3">
      <p className="text-sm text-zinc-600" aria-live="polite">
        {count} acciones seleccionadas. Cambiar de módulo conserva las
        selecciones.
      </p>
      <SectionNavigation
        label="Permisos por módulo"
        selected={module}
        onSelect={setModule}
        items={DOCUMENT_MODULES.map((item) => ({
          id: item.id,
          label: item.name,
        }))}
      />
      {DOCUMENT_MODULES.map((item) => (
        <div hidden={module !== item.id} key={item.id}>
          <fieldset
            className="grid gap-1 rounded-lg border border-zinc-200 p-3 sm:grid-cols-2"
            disabled={busy}
            onChange={(event) => {
              const form = event.currentTarget.closest("form");
              if (form)
                setCount(new FormData(form).getAll("permission_ids").length);
            }}
          >
            <legend className="px-2 text-sm font-medium">{item.name}</legend>
            {permissions
              .filter((permission) => permission.module === item.id)
              .map((permission) => (
                <CheckboxField
                  defaultChecked={selected.has(permission.id)}
                  id={`permission-${permission.id}`}
                  key={permission.id}
                  label={ACTION_LABELS[permission.action] ?? permission.action}
                  name="permission_ids"
                  value={permission.id}
                />
              ))}
          </fieldset>
        </div>
      ))}
    </section>
  );
}

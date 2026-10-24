"use client";
import { useState } from "react";

import { SectionNavigation } from "@/components/molecules/section-navigation";
import { MODULE_IDS } from "@/domain/access/constants/access";
import { DOCUMENT_MODULES } from "@/domain/common/constants/modules";
import type { ModuleSettingsProps } from "@/features/access/types/access-ui.types";
import { ResponsibleForm } from "@/features/companies/components/responsible-form";

export function ModuleSettingsPanel({
  company,
  directory,
  settings,
  onChanged,
}: ModuleSettingsProps) {
  const [selected, setSelected] = useState<string>(MODULE_IDS[0]);
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Responsables por módulo</h2>
      <p className="text-sm text-zinc-500">
        Asignar un responsable exige acceso y permiso de entrega; no los
        concede.
      </p>
      <SectionNavigation
        label="Módulo del responsable"
        selected={selected}
        onSelect={setSelected}
        items={DOCUMENT_MODULES.map((module) => ({
          id: module.id,
          label: module.name,
        }))}
      />
      <div>
        {MODULE_IDS.map((module) => {
          const current = settings.find((item) => item.module === module);
          return (
            <div hidden={selected !== module} key={module}>
              <ResponsibleForm
                company={company}
                current={current}
                directory={directory}
                key={`${module}:${current?.id ?? "new"}:${current?.revision ?? 0}`}
                module={module}
                onSaved={onChanged}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

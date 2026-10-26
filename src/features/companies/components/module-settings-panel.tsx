"use client";
import Link from "next/link";
import { useState } from "react";

import { SectionNavigation } from "@/components/molecules/section-navigation";
import { MODULE_IDS } from "@/domain/access/constants/access";
import { DOCUMENT_MODULES } from "@/domain/common/constants/modules";
import { documentaryProfileSchema } from "@/domain/company-profile/contracts/profile.schema";
import { appliesToProfile } from "@/domain/company-profile/utils/profile";
import type { ModuleSettingsProps } from "@/features/access/types/access-ui.types";
import { ResponsibleForm } from "@/features/companies/components/responsible-form";

export function ModuleSettingsPanel({
  company,
  directory,
  settings,
  onChanged,
}: ModuleSettingsProps) {
  const [selected, setSelected] = useState<string>(MODULE_IDS[0]);
  const profile = documentaryProfileSchema.safeParse(
    company.documentary_profile,
  );
  const modules = DOCUMENT_MODULES.filter((module) =>
    module.id === "actividades" || !company.documentary_profile
      ? true
      : profile.success && appliesToProfile(profile.data, module.id),
  );
  const activeModule = modules.some((module) => module.id === selected)
    ? selected
    : modules[0]?.id;
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Responsables por módulo</h2>
      <p className="text-sm text-zinc-500">
        Asignar un responsable exige acceso y permiso de entrega; no los
        concede.
      </p>
      <SectionNavigation
        label="Módulo del responsable"
        selected={activeModule ?? ""}
        onSelect={setSelected}
        items={modules.map((module) => ({
          id: module.id,
          label: module.name,
        }))}
      />
      <div>
        {modules.map(({ id: module }) => {
          const current = settings.find((item) => item.module === module);
          return (
            <div hidden={activeModule !== module} key={module}>
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
      <p className="text-sm text-slate-600">
        La preparación inicial se activa al guardar un responsable elegible. La
        generación trabaja en lotes y conserva su progreso. Puedes revisar cada
        entregable y continuar los lotes pendientes en{" "}
        <Link
          className="inline-flex min-h-11 items-center text-blue-800 underline"
          href={`/configuracion?tab=reglas&rulesCompany=${company.id}`}
        >
          Entregables por empresa
        </Link>
        . Los eventos laborales conservan su avance en el expediente del
        trabajador.
      </p>
    </section>
  );
}

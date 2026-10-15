import { MODULE_IDS } from "@/domain/access/constants/access";
import type { ModuleSettingsProps } from "@/features/access/types/access-ui.types";
import { ResponsibleForm } from "@/features/companies/components/responsible-form";

export function ModuleSettingsPanel({
  company,
  directory,
  settings,
  onChanged,
}: ModuleSettingsProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Responsables por módulo</h2>
      <p className="text-sm text-zinc-500">
        Asignar un responsable exige acceso y permiso de entrega; no los
        concede.
      </p>
      <div className="grid gap-4 xl:grid-cols-2">
        {MODULE_IDS.map((module) => {
          const current = settings.find((item) => item.module === module);
          return (
            <ResponsibleForm
              company={company}
              current={current}
              directory={directory}
              key={`${module}:${current?.id ?? "new"}:${current?.revision ?? 0}`}
              module={module}
              onSaved={onChanged}
            />
          );
        })}
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";

import { Icon } from "@/components/atoms/icon";
import {
  MODULE_TONES,
  TONE_STYLES,
} from "@/components/constants/visual-styles";
import { SectionNavigation } from "@/components/molecules/section-navigation";
import { ResourceState } from "@/components/organisms/resource-state";
import { MODULE_LABELS } from "@/domain/documents/constants/engine";
import { usePresentation } from "@/features/access/hooks/use-presentation";
import { NAVIGATION_ICONS } from "@/features/auth/constants/navigation-visuals";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import {
  canViewModule,
  moduleDestination,
} from "@/features/auth/utils/module-navigation";
import type { CompanyModuleProps } from "@/features/companies/types/company.types";
import { ObligationList } from "@/features/documents/components/obligation-list";
import { WorkersPanel } from "@/features/workers/components/workers-panel";

export function CompanyModuleWorkspace({
  company,
  module,
}: CompanyModuleProps) {
  const [laborView, setLaborView] = usePresentation("laborView", "workers", [
    "workers",
    "obligations",
  ]);
  const { context } = useWorkspace();
  const allowed =
    company.status === "active" && canViewModule(context, company.id, module);
  return (
    <section className="space-y-3">
      <header className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            <span
              className={`rounded-lg border p-2 ${TONE_STYLES[MODULE_TONES[module]]}`}
            >
              <Icon name={NAVIGATION_ICONS[module]} />
            </span>
            {MODULE_LABELS[module]}
          </h1>
          <Link
            className="inline-flex min-h-11 shrink-0 items-center text-xs underline underline-offset-4"
            href={`/empresas/${company.id}`}
          >
            Ficha empresa
          </Link>
        </div>
        <p className="text-sm text-zinc-600">
          {company.legal_name} · RUC {company.ruc}
        </p>
      </header>
      {!allowed ? (
        <>
          <ResourceState
            title="Acceso restringido"
            description="Este módulo no está disponible para tu cuenta en esta empresa."
            kind="forbidden"
          />
          <Link
            className="inline-flex min-h-11 items-center text-sm underline"
            href={moduleDestination(module)}
          >
            Cambiar empresa
          </Link>
        </>
      ) : module === "laboral_trabajador" ? (
        <>
          <SectionNavigation
            label="Vista de Laboral por trabajador"
            selected={laborView}
            onSelect={setLaborView}
            items={[
              { id: "workers", label: "Trabajadores" },
              { id: "obligations", label: "Obligaciones" },
            ]}
          />
          {laborView === "workers" ? (
            <WorkersPanel companyId={company.id} />
          ) : (
            <ObligationList companyId={company.id} module={module} />
          )}
        </>
      ) : (
        <ObligationList companyId={company.id} module={module} />
      )}
    </section>
  );
}

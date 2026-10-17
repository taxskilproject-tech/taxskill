"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ResourceState } from "@/components/organisms/resource-state";
import { canPerform } from "@/domain/access/utils/permissions";
import { DOCUMENT_MODULES } from "@/domain/common/constants/modules";
import { ActivityInbox } from "@/features/activities/components/activity-inbox";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import type { CompanyDetailProps } from "@/features/companies/types/company.types";
import { ObligationList } from "@/features/documents/components/obligation-list";
import { WorkersPanel } from "@/features/workers/components/workers-panel";

export function CompanyDocumentTabs({ companyId }: CompanyDetailProps) {
  const { context } = useWorkspace();
  const parameters = useSearchParams();
  const requested = parameters.get("tab") ?? "resumen";
  const tab = [
    "resumen",
    "tributario",
    "laboral_trabajador",
    "laboral_general",
    "actividades",
    "historial",
  ].includes(requested)
    ? requested
    : "resumen";
  const modules = DOCUMENT_MODULES.filter(
    (module) =>
      context.member.is_admin ||
      canPerform(
        context.capabilities,
        companyId,
        module.id,
        "view",
        context.member.member_type,
      ),
  );
  const authorized =
    tab === "resumen" ||
    tab === "historial" ||
    modules.some((module) => module.id === tab);
  const selectedModule = modules.find((module) => module.id === tab);
  return (
    <section className="space-y-5">
      <nav
        aria-label="Áreas de la empresa"
        className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3"
      >
        <Link
          aria-current={tab === "resumen" ? "page" : undefined}
          className="inline-flex min-h-11 items-center rounded-lg px-4 text-sm hover:bg-zinc-100"
          href={`/empresas/${companyId}?tab=resumen`}
        >
          Resumen
        </Link>
        {modules.map((module) => (
          <Link
            aria-current={module.id === tab ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-lg px-4 text-sm ${module.id === tab ? "bg-zinc-950 text-white" : "hover:bg-zinc-100"}`}
            href={`/empresas/${companyId}?tab=${module.id}`}
            key={module.id}
          >
            {module.name}
          </Link>
        ))}
        <Link
          aria-current={tab === "historial" ? "page" : undefined}
          className={`inline-flex min-h-11 items-center rounded-lg px-4 text-sm ${tab === "historial" ? "bg-zinc-950 text-white" : "hover:bg-zinc-100"}`}
          href={`/empresas/${companyId}?tab=historial`}
        >
          Historial
        </Link>
      </nav>
      {!authorized && (
        <ResourceState
          description="No tienes acceso a esta área."
          kind="forbidden"
          title="Acceso restringido"
        />
      )}
      {authorized &&
        (tab === "resumen" ||
          ["tributario", "historial", "laboral_general"].includes(tab)) && (
          <ObligationList
            companyId={companyId}
            key={tab}
            module={selectedModule?.id}
          />
        )}
      {authorized && tab === "laboral_trabajador" && (
        <div className="space-y-7">
          <WorkersPanel companyId={companyId} />
          <details className="rounded-xl border border-zinc-200 bg-white p-5">
            <summary className="cursor-pointer text-sm font-medium">
              Todas las obligaciones por trabajador de esta empresa
            </summary>
            <div className="mt-5">
              <ObligationList
                companyId={companyId}
                module="laboral_trabajador"
              />
            </div>
          </details>
        </div>
      )}
      {authorized && tab === "actividades" && (
        <ActivityInbox companyId={companyId} />
      )}
    </section>
  );
}

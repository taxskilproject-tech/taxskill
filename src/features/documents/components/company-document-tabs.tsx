"use client";
import { SectionNavigation } from "@/components/molecules/section-navigation";
import { ResourceState } from "@/components/organisms/resource-state";
import { canPerform } from "@/domain/access/utils/permissions";
import { DOCUMENT_MODULES } from "@/domain/common/constants/modules";
import { usePresentation } from "@/features/access/hooks/use-presentation";
import { ActivityInbox } from "@/features/activities/components/activity-inbox";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import type { CompanyTabsProps } from "@/features/companies/types/company.types";
import { ObligationList } from "@/features/documents/components/obligation-list";

const TABS = [
  "resumen",
  "tributario",
  "laboral_trabajador",
  "laboral_general",
  "actividades",
  "historial",
  "administracion",
];
export function CompanyDocumentTabs({
  companyId,
  summary,
  administration,
}: CompanyTabsProps) {
  const { context } = useWorkspace();
  const [tab, setTab] = usePresentation("tab", "resumen", TABS);
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
    (tab === "administracion" && context.member.is_admin) ||
    modules.some((module) => module.id === tab);
  const items = [
    { id: "resumen", label: "Resumen" },
    ...modules.map((module) => ({ id: module.id, label: module.name })),
    { id: "historial", label: "Historial" },
    ...(context.member.is_admin
      ? [{ id: "administracion", label: "Administración" }]
      : []),
  ];
  return (
    <section className="space-y-3">
      <SectionNavigation
        items={items}
        label="Módulos de la empresa"
        onSelect={setTab}
        selected={tab}
      />
      {!authorized ? (
        <ResourceState
          description="No tienes acceso a este módulo."
          kind="forbidden"
          title="Acceso restringido"
        />
      ) : (
        <>
          {tab === "resumen" && summary}
          {(tab === "resumen" || tab === "historial") && (
            <ObligationList companyId={companyId} key={tab} />
          )}
          {tab === "actividades" && <ActivityInbox companyId={companyId} />}
          {tab === "administracion" && administration}
        </>
      )}
    </section>
  );
}

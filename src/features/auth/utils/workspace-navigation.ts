import type { SessionContext } from "@/features/auth/types/auth.types";
import type { NavigationItem } from "@/features/auth/types/navigation.types";
import {
  canViewModule,
  DOCUMENTARY_MODULES,
  documentaryModule,
  moduleCompanies,
  moduleDestination,
} from "@/features/auth/utils/module-navigation";
import type { CompanyScope } from "@/lib/query/types/query.types";

export function workspaceNavigation(
  context: SessionContext,
  company: CompanyScope = { kind: "all" },
): NavigationItem[] {
  const can = (action: string) =>
    context.member.is_admin ||
    context.capabilities.some((item) => item.action === action);
  const modules: NavigationItem[] = DOCUMENTARY_MODULES.flatMap((item) => {
    const moduleId = documentaryModule(item.id);
    if (!moduleId) return [];
    const allowed =
      company.kind === "company"
        ? canViewModule(context, company.companyId, moduleId)
        : context.member.is_admin ||
          moduleCompanies(context, moduleId).length > 0;
    return allowed
      ? [
          {
            id: moduleId,
            label: item.name,
            group: "Módulos",
            href: moduleDestination(
              moduleId,
              company.kind === "company" ? company.companyId : null,
            ),
          },
        ]
      : [];
  });
  return [
    { id: "inicio", href: "/dashboard", label: "Inicio", group: "Trabajo" },
    {
      id: "actividades",
      href: "/actividades",
      label: "Actividades",
      group: "Trabajo",
    },
    ...modules,
    { id: "empresas", href: "/empresas", label: "Empresas", group: "Consulta" },
    {
      id: "documentos",
      href: "/documentos",
      label: "Documentos",
      group: "Consulta",
    },
    ...(can("reports.view")
      ? [
          {
            id: "reportes" as const,
            href: "/reportes",
            label: "Reportes",
            group: "Supervisión",
          },
        ]
      : []),
    ...(can("audit.view")
      ? [
          {
            id: "auditoria" as const,
            href: "/auditoria",
            label: "Auditoría",
            group: "Supervisión",
          },
        ]
      : []),
    {
      id: "notificaciones",
      href: "/notificaciones",
      label: "Notificaciones",
      group: "Supervisión",
    },
    ...(context.member.is_admin
      ? [
          {
            id: "usuarios" as const,
            href: "/usuarios",
            label: "Usuarios",
            group: "Administración",
          },
          {
            id: "configuracion" as const,
            href: "/configuracion",
            label: "Configuración",
            group: "Administración",
          },
        ]
      : []),
  ];
}

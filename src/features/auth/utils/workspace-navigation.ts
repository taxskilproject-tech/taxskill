import type { SessionContext } from "@/features/auth/types/auth.types";
import type { NavigationItem } from "@/features/auth/types/navigation.types";

export function workspaceNavigation(context: SessionContext): NavigationItem[] {
  const can = (action: string) =>
    context.member.is_admin ||
    context.capabilities.some((item) => item.action === action);
  return [
    { href: "/dashboard", label: "Inicio", group: "Trabajo" },
    { href: "/actividades", label: "Actividades", group: "Trabajo" },
    { href: "/empresas", label: "Empresas", group: "Trabajo" },
    { href: "/documentos", label: "Documentos", group: "Trabajo" },
    ...(can("reports.view")
      ? [{ href: "/reportes", label: "Reportes", group: "Supervisión" }]
      : []),
    ...(can("audit.view")
      ? [{ href: "/auditoria", label: "Auditoría", group: "Supervisión" }]
      : []),
    { href: "/notificaciones", label: "Notificaciones", group: "Supervisión" },
    ...(context.member.is_admin
      ? [
          { href: "/usuarios", label: "Usuarios", group: "Administración" },
          {
            href: "/configuracion",
            label: "Configuración",
            group: "Administración",
          },
        ]
      : []),
  ];
}

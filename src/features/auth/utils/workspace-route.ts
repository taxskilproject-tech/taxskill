import { z } from "zod";

import { MAX_NAVIGATION_ORIGIN_DEPTH } from "@/features/auth/constants/navigation";
import type { WorkspaceRoute } from "@/features/auth/types/company-context.types";
import type { NavigationId } from "@/features/auth/types/navigation.types";
import { documentaryModule } from "@/features/auth/utils/module-navigation";
import { safeReturnTo } from "@/features/auth/utils/safe-return-to";

const COMPANY_ROUTE =
  /^\/empresas\/([0-9a-f-]{36})(\/trabajadores\/[0-9a-f-]{36})?$/;
const BASE_NAVIGATION: Readonly<Record<string, NavigationId>> = {
  dashboard: "inicio",
  actividades: "actividades",
  empresas: "empresas",
  documentos: "documentos",
  reportes: "reportes",
  auditoria: "auditoria",
  notificaciones: "notificaciones",
  usuarios: "usuarios",
  configuracion: "configuracion",
  "buzon-sunat": "buzon-sunat",
};

export function workspaceRoute(
  pathname: string,
  parameters: URLSearchParams,
  depth = 0,
): WorkspaceRoute {
  if (pathname === "/buzon-sunat") {
    const id = z.uuid().safeParse(parameters.get("companyId"));
    return {
      companyId: id.success ? id.data : null,
      module: null,
      picker: false,
      singleCompany: true,
    };
  }
  const company = COMPANY_ROUTE.exec(pathname);
  if (company)
    return {
      companyId: company[1],
      module: company[2]
        ? "laboral_trabajador"
        : documentaryModule(parameters.get("tab")),
      picker: false,
    };
  const moduleId =
    pathname === "/empresas"
      ? documentaryModule(parameters.get("module"))
      : null;
  if (moduleId) return { companyId: null, module: moduleId, picker: true };
  if (
    pathname.startsWith("/actividades/") &&
    parameters.has("returnTo") &&
    depth < MAX_NAVIGATION_ORIGIN_DEPTH
  ) {
    const origin = new URL(
      safeReturnTo(parameters.get("returnTo")),
      "https://taxskills.invalid",
    );
    return workspaceRoute(origin.pathname, origin.searchParams, depth + 1);
  }
  return { companyId: null, module: null, picker: false };
}

export function activeNavigation(
  pathname: string,
  parameters: URLSearchParams,
  depth = 0,
): NavigationId {
  const route = workspaceRoute(pathname, parameters);
  if (route.module) return route.module;
  if (COMPANY_ROUTE.test(pathname) && parameters.get("tab") === "actividades")
    return "actividades";
  if (
    pathname.startsWith("/actividades/") &&
    parameters.has("returnTo") &&
    depth < MAX_NAVIGATION_ORIGIN_DEPTH
  ) {
    const origin = new URL(
      safeReturnTo(parameters.get("returnTo")),
      "https://taxskills.invalid",
    );
    return activeNavigation(origin.pathname, origin.searchParams, depth + 1);
  }
  return BASE_NAVIGATION[pathname.split("/")[1]] ?? "inicio";
}

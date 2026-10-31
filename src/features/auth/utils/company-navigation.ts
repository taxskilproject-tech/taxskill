import { canReadSunat } from "@/domain/sunat/utils/access";
import type { SessionContext } from "@/features/auth/types/auth.types";
import type { WorkspaceRoute } from "@/features/auth/types/company-context.types";
import { moduleDestination } from "@/features/auth/utils/module-navigation";
import type { CompanyScope } from "@/lib/query/types/query.types";

export function selectedCompany(
  context: SessionContext | null,
  remembered: string,
  route: WorkspaceRoute,
) {
  if (!context || route.picker) return "all";
  const candidate = route.companyId ?? remembered;
  if (route.singleCompany && !canReadSunat(context, candidate)) return "all";
  if (context.companies.some((company) => company.id === candidate))
    return candidate;
  if (
    !route.module &&
    !route.singleCompany &&
    candidate === "internal" &&
    context.member.member_type === "internal"
  )
    return "internal";
  return "all";
}

export function companyScope(selection: string): CompanyScope {
  if (selection === "all" || selection === "internal")
    return { kind: selection };
  return { kind: "company", companyId: selection };
}

export function companyChangeDestination(
  pathname: string,
  route: WorkspaceRoute,
  selection: string,
) {
  const companyId =
    selection === "all" || selection === "internal" ? null : selection;
  if (pathname === "/buzon-sunat")
    return "/buzon-sunat" + (companyId ? "?companyId=" + companyId : "");
  if (route.module) return moduleDestination(route.module, companyId);
  if (pathname.startsWith("/empresas/"))
    return companyId ? `/empresas/${companyId}` : "/empresas";
  return null;
}

import { canPerform } from "@/domain/access/utils/permissions";
import { DOCUMENT_MODULES } from "@/domain/common/constants/modules";
import type { DocumentaryModuleId } from "@/domain/common/types/module.types";
import type { SessionContext } from "@/features/auth/types/auth.types";

export function documentaryModule(
  value: string | null,
): DocumentaryModuleId | null {
  if (
    value === "tributario" ||
    value === "laboral_trabajador" ||
    value === "laboral_general"
  )
    return value;
  return null;
}

export const DOCUMENTARY_MODULES = DOCUMENT_MODULES.filter(
  (item) => documentaryModule(item.id) !== null,
);

export function canViewModule(
  context: SessionContext,
  companyId: string,
  module: DocumentaryModuleId,
) {
  return (
    context.member.is_admin ||
    canPerform(
      context.capabilities,
      companyId,
      module,
      "view",
      context.member.member_type,
    )
  );
}

export function moduleCompanies(
  context: SessionContext,
  module: DocumentaryModuleId,
) {
  return context.companies.filter(
    (company) =>
      company.status === "active" && canViewModule(context, company.id, module),
  );
}

export function moduleDestination(
  module: DocumentaryModuleId,
  companyId?: string | null,
) {
  return companyId
    ? `/empresas/${companyId}?tab=${module}`
    : `/empresas?module=${module}`;
}

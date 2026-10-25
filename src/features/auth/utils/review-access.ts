import type { SessionContext } from "@/features/auth/types/auth.types";
import type { CompanyScope } from "@/lib/query/types/query.types";

export function canReviewScope(
  context: SessionContext,
  company: CompanyScope,
): boolean {
  if (context.member.is_admin) return true;
  if (context.member.member_type === "client") return false;
  return context.capabilities.some(
    (item) =>
      ["approve", "observe"].includes(item.action) &&
      (company.kind === "all" ||
        (company.kind === "internal"
          ? item.company_id === null
          : item.company_id === company.companyId)),
  );
}

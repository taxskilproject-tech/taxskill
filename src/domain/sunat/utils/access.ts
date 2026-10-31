import type { SunatAccessContext } from "../types/access.types";

export function canReadSunat(
  context: SunatAccessContext,
  companyId?: string,
): boolean {
  if (context.member.member_type !== "internal") return false;
  if (context.member.is_admin) return true;
  const authorized = context.mailbox_company_ids ?? [];
  return companyId ? authorized.includes(companyId) : authorized.length > 0;
}

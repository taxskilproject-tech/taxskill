import type { SessionContext } from "@/features/auth/types/auth.types";

export function authorizationIdentity(context: SessionContext) {
  return JSON.stringify([
    context.member.id,
    context.member.is_admin,
    context.member.member_type,
    context.organization.status,
    context.organization.deleted_at,
    context.companies.map((company) => company.id).sort(),
    [...(context.mailbox_company_ids ?? [])].sort(),
    context.capabilities
      .map((item) => [item.company_id, item.module, item.action].join(":"))
      .sort(),
  ]);
}

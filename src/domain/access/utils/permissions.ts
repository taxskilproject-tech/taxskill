import { REVIEW_ACTIONS } from "@/domain/access/constants/access";
import type { Action, Capability } from "@/domain/access/types/access.types";
import type { ModuleId } from "@/domain/common/types/module.types";

export function canPerform(
  capabilities: readonly Capability[],
  companyId: string | null,
  module: ModuleId,
  action: Action,
  memberType: string,
) {
  if (
    memberType === "client" &&
    REVIEW_ACTIONS.some((value) => value === action)
  )
    return false;
  if (memberType === "client" && companyId === null) return false;
  return capabilities.some(
    (item) =>
      item.company_id === companyId &&
      item.module === module &&
      item.action === action,
  );
}

export function resolvePermission(
  roleAllowed: boolean,
  override: boolean | undefined,
  action: Action,
  memberType: string,
) {
  if (
    memberType === "client" &&
    REVIEW_ACTIONS.some((value) => value === action)
  )
    return false;
  return override ?? roleAllowed;
}

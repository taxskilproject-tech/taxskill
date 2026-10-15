import type {
  Directory,
  Grant,
  Override,
} from "@/domain/access/types/access.types";
import type { ModuleId } from "@/domain/common/types/module.types";

export function eligibleInternalProfiles(directory: Directory) {
  const memberIds = new Set(directory.members.filter((member) => member.member_type === "internal" && member.active && !member.deleted_at).map((member) => member.user_id));
  return directory.profiles.filter((profile) => memberIds.has(profile.user_id) && profile.enabled && profile.provisioning_status === "ready" && !profile.deleted_at);
}

export function eligibleResponsibles(
  directory: Directory,
  grants: readonly Grant[],
  overrides: readonly Override[],
  module: ModuleId,
) {
  const permission = directory.permissions.find(
    (item) => item.module === module && item.action === "upload",
  );
  if (!permission) return [];
  const eligibleMembers = directory.members.filter((member) => {
    if (!member.active || member.deleted_at) return false;
    const grant = grants.find(
      (item) =>
        item.member_id === member.id &&
        item.module === module &&
        item.active &&
        !item.deleted_at,
    );
    const role = directory.roles.find(
      (item) =>
        item.id === grant?.role_id &&
        item.audience === member.member_type &&
        item.active &&
        !item.deleted_at,
    );
    if (!grant || !role) return false;
    const override = overrides.find(
      (item) =>
        item.grant_id === grant.id &&
        item.permission_id === permission.id &&
        !item.deleted_at,
    );
    return (
      override?.allowed ??
      directory.rolePermissions.some(
        (item) =>
          item.role_id === role.id &&
          item.permission_id === permission.id &&
          !item.deleted_at,
      )
    );
  });
  return directory.profiles.filter(
    (profile) =>
      profile.enabled &&
      profile.provisioning_status === "ready" &&
      !profile.deleted_at &&
      eligibleMembers.some((member) => member.user_id === profile.user_id),
  );
}

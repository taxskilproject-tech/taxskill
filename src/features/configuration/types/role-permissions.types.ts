import type { Directory } from "@/domain/access/types/access.types";

export interface RolePermissionsProps {
  permissions: Directory["permissions"];
  selected: ReadonlySet<string>;
  busy: boolean;
}

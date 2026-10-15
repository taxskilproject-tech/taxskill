import type {
  Directory,
  Grant,
  Override,
  Permission,
  UserRecord,
} from "@/domain/access/types/access.types";
import type { ModuleId } from "@/domain/common/types/module.types";
import type { SessionContext } from "@/features/auth/types/auth.types";

export interface GrantOverridesProps {
  permissions: Permission[];
  overrides: Override[];
  grant?: Grant;
  memberType: string;
  disabled: boolean;
}
export interface GrantContextFieldsProps {
  user: UserRecord;
  directory: Directory;
  grant?: Grant;
  companies: SessionContext["companies"];
  scope: string;
  module: ModuleId;
  onScope: (value: string) => void;
  onModule: (value: string) => void;
  disabled: boolean;
}

import type { UserRecord } from "@/domain/access/types/access.types";
import type { Directory } from "@/domain/access/types/access.types";

export interface UserListProps {
  users: UserRecord[];
  selected: string;
  onSelect: (id: string) => void;
}
export interface UserManagementProps {
  memberId: string;
  directory: Directory;
  onClose: () => void;
  onChanged: () => void;
}

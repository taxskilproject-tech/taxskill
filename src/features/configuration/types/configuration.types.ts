import type { Directory } from "@/domain/access/types/access.types";

export interface RolesPanelProps {
  directory: Directory;
  onChanged: () => void;
}
export interface DeletedRecord {
  id: string;
  revision: number;
  label: string;
  reason: string;
  deletedAt: string;
}

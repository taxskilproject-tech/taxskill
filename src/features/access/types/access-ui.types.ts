import type { FormEvent, ReactNode } from "react";
import type { z } from "zod";

import type {
  Company,
  Directory,
  Grant,
  ModuleSettings,
  Override,
  Role,
  SoftDeleteEntity,
  UserRecord,
} from "@/domain/access/types/access.types";
import type { ModuleId } from "@/domain/common/types/module.types";
import type { OperationResult } from "@/domain/common/types/operation.types";

export interface ActionState<T> {
  busy: boolean;
  error: string | null;
  result: T | null;
  run: (work: () => Promise<OperationResult<T>>) => Promise<boolean>;
  clear: () => void;
}
export interface FormActionProps {
  disabled?: boolean;
  busy: boolean;
  error: string | null;
  success?: string | null;
  label?: string;
  loadingText?: string;
  onCancel?: () => void;
}
export interface PageHeadingProps {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}
export interface CompanyFormProps {
  company?: Company;
  directory: Directory;
  onSaved: () => void;
  onCancel: () => void;
}
export interface CompanyListProps {
  companies: Company[];
  isAdmin: boolean;
  onEdit: (company: Company) => void;
  onChanged: () => void;
}
export interface LifecycleProps {
  entity: SoftDeleteEntity;
  id: string;
  revision: number;
  deleted: boolean;
  onChanged: () => void;
}
export interface RoleFormProps {
  role?: Role;
  directory: Directory;
  onSaved: () => void;
  onCancel: () => void;
}
export interface GrantFormProps {
  user: UserRecord;
  directory: Directory;
  grant?: Grant;
  overrides: Override[];
  onSaved: () => void;
  onCancel: () => void;
}
export interface GrantListProps {
  user: UserRecord;
  directory: Directory;
  grants: Grant[];
  overrides: Override[];
  onChanged: () => void;
}
export interface UserFormProps {
  directory: Directory;
  onSaved: () => void;
  onCancel: () => void;
}
export interface UserDetailProps {
  user: UserRecord;
  directory: Directory;
  onChanged: () => void;
}
export interface ModuleSettingsProps {
  company: Company;
  directory: Directory;
  settings: ModuleSettings[];
  onChanged: () => void;
}
export interface ResponsibleFormProps {
  company: Company;
  module: ModuleId;
  current?: ModuleSettings;
  directory: Directory;
  onSaved: () => void;
}
export interface QueryStateProps {
  loading: boolean;
  error: unknown;
  children: ReactNode;
  onRetry: () => void;
  retrying: boolean;
}
export interface ListToolbarProps {
  query: string;
  deleted: boolean;
  onQuery: (value: string) => void;
  onDeleted: (value: boolean) => void;
  allowDeleted: boolean;
}
export interface PaginationProps {
  page: number;
  count: number;
  onPage: (page: number) => void;
}
export interface ParsedForm<T> {
  data: T | null;
  error: string | null;
}
export type FormSchema<T> = z.ZodType<T>;
export type SubmitEvent = FormEvent<HTMLFormElement>;

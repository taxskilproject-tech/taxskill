import type { z } from "zod";

import type {
  ACTIONS,
  ADMIN_OPERATIONS,
  MUTATION_OPERATIONS,
  SOFT_DELETE_ENTITIES,
} from "@/domain/access/constants/access";
import type {
  adminEnvelopeSchema,
  capabilitySchema,
  commandEnvelopeSchema,
  commandResultSchema,
  companySchema,
  createUserSchema,
  grantSchema,
  roleSchema,
} from "@/domain/access/contracts/access.schema";
import type { Database, Json } from "@/lib/supabase/types/database.types";

type StoredCompany = Database["public"]["Tables"]["companies"]["Row"];
type CompanyProfileFields =
  "tax_regime_code" | "documentary_profile" | "document_template_version_id";
export type Company = Omit<StoredCompany, CompanyProfileFields> &
  Partial<Pick<StoredCompany, CompanyProfileFields>>;
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Member =
  Database["public"]["Tables"]["organization_members"]["Row"];
export type Role = Database["public"]["Tables"]["roles"]["Row"];
export type Permission = Database["public"]["Tables"]["permissions"]["Row"];
export type Grant = Database["public"]["Tables"]["access_grants"]["Row"];
export type Override =
  Database["public"]["Tables"]["grant_permission_overrides"]["Row"];
export type RolePermission =
  Database["public"]["Tables"]["role_permissions"]["Row"];
export type ModuleSettings =
  Database["public"]["Tables"]["company_module_settings"]["Row"];
export type Action = (typeof ACTIONS)[number];
export type AdminOperation = (typeof ADMIN_OPERATIONS)[number];
export type MutationOperation = (typeof MUTATION_OPERATIONS)[number];
export type SoftDeleteEntity = (typeof SOFT_DELETE_ENTITIES)[number];
export type CompanyInput = z.input<typeof companySchema>;
export type RoleInput = z.input<typeof roleSchema>;
export type GrantInput = z.input<typeof grantSchema>;
export type CreateUserInput = z.input<typeof createUserSchema>;
export type CommandResult = z.infer<typeof commandResultSchema>;
export type Capability = z.infer<typeof capabilitySchema>;
export type CommandEnvelope = z.infer<typeof commandEnvelopeSchema>;
export type AdminEnvelope = z.infer<typeof adminEnvelopeSchema>;
export type JsonObject = { [key: string]: Json | undefined };
export interface ListFilter {
  page: number;
  query: string;
  deleted: boolean;
}
export interface PageResult<T> {
  rows: T[];
  count: number;
}
export interface Directory {
  members: Member[];
  profiles: Profile[];
  roles: Role[];
  permissions: Permission[];
  rolePermissions: RolePermission[];
}
export interface UserRecord {
  profile: Profile;
  member: Member;
}

export const MODULE_IDS = [
  "tributario",
  "laboral_trabajador",
  "laboral_general",
  "actividades",
] as const;
export const ACTIONS = [
  "view",
  "upload",
  "download",
  "approve",
  "observe",
  "reopen",
  "waive",
  "reports.view",
  "reports.export",
  "workers.manage",
  "audit.view",
] as const;
export const REVIEW_ACTIONS = ["approve", "observe", "reopen"] as const;
export const PAGE_SIZE = 25;
export const ADMIN_OPERATIONS = [
  "CreateUser",
  "SetUserPassword",
  "SetUserEnabled",
] as const;
export const MUTATION_OPERATIONS = [
  "CreateOrUpdateCompany",
  "SaveRole",
  "AssignAccess",
  "DeleteEntity",
  "RestoreEntity",
  "SaveModuleSettings",
  "SaveMembership",
  "SaveOrganization",
] as const;
export const SOFT_DELETE_ENTITIES = [
  "organizations",
  "profiles",
  "organization_members",
  "companies",
  "roles",
  "role_permissions",
  "access_grants",
  "grant_permission_overrides",
  "company_module_settings",
] as const;

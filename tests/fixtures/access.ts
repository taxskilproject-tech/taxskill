import type {
  Company,
  Directory,
  Grant,
  ModuleSettings,
} from "@/domain/access/types/access.types";

export const fixtureId = "11111111-1111-4111-8111-111111111111";
const metadata = {
  created_at: "2026-10-14T00:00:00Z",
  created_by: null,
  updated_at: "2026-10-14T00:00:00Z",
  updated_by: null,
  revision: 0,
  deleted_at: null,
  deleted_by: null,
  deletion_reason: null,
};
export const companyFixture: Company = {
  ...metadata,
  id: fixtureId,
  organization_id: fixtureId,
  ruc: "20000000001",
  legal_name: "Empresa ficticia",
  trade_name: null,
  address: null,
  contact_email: null,
  contact_phone: null,
  legal_representative: null,
  tax_regime: null,
  status: "active",
  accountant_id: null,
  supervisor_id: null,
  control_start_date: "2026-10-14",
  operation_pauses: [],
};
export const directoryFixture: Directory = {
  profiles: [
    {
      ...metadata,
      user_id: fixtureId,
      email: "fixture@example.test",
      full_name: "Responsable ficticio",
      whatsapp_phone: null,
      enabled: true,
      provisioning_status: "ready",
    },
  ],
  members: [
    {
      ...metadata,
      id: fixtureId,
      organization_id: fixtureId,
      user_id: fixtureId,
      member_type: "client",
      is_admin: false,
      active: true,
    },
  ],
  roles: [
    {
      ...metadata,
      id: fixtureId,
      organization_id: fixtureId,
      code: "cliente",
      name: "Cliente",
      description: null,
      audience: "client",
      active: true,
    },
  ],
  permissions: [
    {
      id: fixtureId,
      organization_id: fixtureId,
      module: "tributario",
      action: "upload",
      description: "Entregar",
      created_at: metadata.created_at,
      created_by: null,
    },
  ],
  rolePermissions: [
    {
      ...metadata,
      id: fixtureId,
      organization_id: fixtureId,
      role_id: fixtureId,
      permission_id: fixtureId,
    },
  ],
};
export const grantFixture: Grant = {
  ...metadata,
  id: fixtureId,
  organization_id: fixtureId,
  member_id: fixtureId,
  company_id: fixtureId,
  role_id: fixtureId,
  scope: "company",
  module: "tributario",
  active: true,
};
export const moduleSettingsFixture: ModuleSettings = {
  ...metadata,
  id: fixtureId,
  organization_id: fixtureId,
  company_id: fixtureId,
  module: "tributario",
  delivery_responsible_id: fixtureId,
};

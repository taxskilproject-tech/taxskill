import type { SessionContext } from "@/features/auth/types/auth.types";

export const moduleCompanyA = "11111111-1111-4111-8111-111111111111";
export const moduleCompanyB = "22222222-2222-4222-8222-222222222222";
export const moduleContext: SessionContext = {
  session_id: moduleCompanyA,
  profile: {
    user_id: moduleCompanyA,
    full_name: "Cuenta local",
    email: "fixture@example.test",
    enabled: true,
    revision: 1,
  },
  member: {
    id: moduleCompanyA,
    organization_id: moduleCompanyA,
    user_id: moduleCompanyA,
    member_type: "internal",
    is_admin: false,
  },
  organization: {
    id: moduleCompanyA,
    name: "Estudio local",
    status: "active",
    deleted_at: null,
    revision: 1,
    settings: {
      schema_version: 1,
      upcoming_days: 7,
      digest_local_time: "09:00",
      generation_local_time: "00:05",
      default_max_file_bytes: 20000000,
      allowed_formats: ["pdf"],
      compliance_thresholds: { green: 90, yellow: 70 },
    },
  },
  companies: [
    {
      id: moduleCompanyA,
      legal_name: "Empresa A",
      ruc: "20000000001",
      status: "active",
    },
    {
      id: moduleCompanyB,
      legal_name: "Empresa B",
      ruc: "20000000002",
      status: "active",
    },
  ],
  capabilities: [
    { company_id: moduleCompanyA, module: "tributario", action: "view" },
    {
      company_id: moduleCompanyB,
      module: "laboral_trabajador",
      action: "view",
    },
  ],
};

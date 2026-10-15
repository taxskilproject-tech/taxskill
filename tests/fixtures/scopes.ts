import type { DataScope } from "@/lib/query/types/query.types";

export const companyScope: DataScope = {
  userId: "11111111-1111-4111-8111-111111111111",
  organizationId: "22222222-2222-4222-8222-222222222222",
  company: {
    kind: "company",
    companyId: "33333333-3333-4333-8333-333333333333",
  },
  module: "tributario",
};

export const otherUserScope: DataScope = {
  ...companyScope,
  userId: "44444444-4444-4444-8444-444444444444",
};

export const otherCompanyScope: DataScope = {
  ...companyScope,
  company: {
    kind: "company",
    companyId: "55555555-5555-4555-8555-555555555555",
  },
};

export const publicEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    "sb_publishable_h01_public_test_fixture",
};

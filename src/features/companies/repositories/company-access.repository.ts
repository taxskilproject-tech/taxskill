import {
  requireBrowserClient,
  requireData,
} from "@/features/access/repositories/access.repository";

export async function loadCompanyAccess(
  organizationId: string,
  companyId: string,
  signal: AbortSignal,
) {
  const client = requireBrowserClient();
  const grantsResult = await client
    .from("access_grants")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("company_id", companyId)
    .abortSignal(signal);
  const grants = requireData(grantsResult.data, grantsResult.error);
  const overrides = grants.length
    ? await client
        .from("grant_permission_overrides")
        .select("*")
        .eq("organization_id", organizationId)
        .in(
          "grant_id",
          grants.map((item) => item.id),
        )
        .abortSignal(signal)
    : { data: [], error: null };
  return { grants, overrides: requireData(overrides.data, overrides.error) };
}

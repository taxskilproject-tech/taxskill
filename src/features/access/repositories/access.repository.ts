import { z } from "zod";

import { PAGE_SIZE } from "@/domain/access/constants/access";
import {
  commandEnvelopeSchema,
  commandResultSchema,
} from "@/domain/access/contracts/access.schema";
import type {
  CommandEnvelope,
  Directory,
  ListFilter,
} from "@/domain/access/types/access.types";
import { normalizeOperationError } from "@/domain/common/utils/normalize-operation-error";
import { failure } from "@/domain/common/utils/operation-result";
import { userRowSchema } from "@/features/access/contracts/directory-row.schema";
import { operationStatusSchema } from "@/features/users/contracts/operation-status.schema";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { asJson } from "@/lib/supabase/utils/as-json";
import { decodeRpc } from "@/lib/supabase/utils/decode-rpc";

export function requireBrowserClient() {
  const connection = createSupabaseBrowserClient();
  if (!connection.ok) throw connection.error;
  return connection.data;
}

export function requireData<T>(data: T | null, error: unknown): T {
  if (error || data === null) throw normalizeOperationError(error);
  return data;
}

export { asJson };

export async function executeCommand(envelope: CommandEnvelope) {
  const parsed = commandEnvelopeSchema.safeParse(envelope);
  if (!parsed.success)
    return failure({
      code: "VALIDATION_ERROR",
      message: "Revisa los datos de la operación.",
    });
  try {
    const client = requireBrowserClient();
    const { data, error } = await client.rpc("h02_command", {
      p_organization_id: parsed.data.organization_id,
      p_request_id: parsed.data.request_id,
      p_operation: parsed.data.operation,
      p_input: asJson(parsed.data.input),
    });
    return decodeRpc(data, error, commandResultSchema);
  } catch (error) {
    return failure(normalizeOperationError(error));
  }
}

export async function listCompanies(
  organizationId: string,
  filter: ListFilter,
  signal: AbortSignal,
  companyIds?: readonly string[],
) {
  if (companyIds && !companyIds.length) return { rows: [], count: 0 };
  let query = requireBrowserClient()
    .from("companies")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("legal_name")
    .order("id");
  if (companyIds) query = query.in("id", [...companyIds]);
  query = filter.deleted
    ? query.not("deleted_at", "is", null)
    : query.is("deleted_at", null);
  if (filter.query.trim())
    query = query.ilike(
      "legal_name",
      "%" + filter.query.trim().replaceAll(/[%,_]/g, "") + "%",
    );
  const start = (filter.page - 1) * PAGE_SIZE;
  const { data, error, count } = await query
    .range(start, start + PAGE_SIZE - 1)
    .abortSignal(signal);
  return { rows: requireData(data, error), count: count ?? 0 };
}

export async function loadDirectory(
  organizationId: string,
  signal: AbortSignal,
): Promise<Directory> {
  const client = requireBrowserClient();
  const [members, roles, permissions, rolePermissions] = await Promise.all([
    client
      .from("organization_members")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at")
      .limit(1000)
      .abortSignal(signal),
    client
      .from("roles")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name")
      .limit(1000)
      .abortSignal(signal),
    client
      .from("permissions")
      .select("*")
      .eq("organization_id", organizationId)
      .order("module")
      .order("action")
      .limit(100)
      .abortSignal(signal),
    client
      .from("role_permissions")
      .select("*")
      .eq("organization_id", organizationId)
      .limit(1000)
      .abortSignal(signal),
  ]);
  const memberRows = requireData(members.data, members.error);
  const ids = memberRows.map((member) => member.user_id);
  const profiles = ids.length
    ? await client
        .from("profiles")
        .select("*")
        .in("user_id", ids)
        .abortSignal(signal)
    : { data: [], error: null };
  return {
    members: memberRows,
    profiles: requireData(profiles.data, profiles.error),
    roles: requireData(roles.data, roles.error),
    permissions: requireData(permissions.data, permissions.error),
    rolePermissions: requireData(rolePermissions.data, rolePermissions.error),
  };
}

export async function listUsers(
  organizationId: string,
  filter: ListFilter,
  signal: AbortSignal,
) {
  let query = requireBrowserClient()
    .from("h02_users")
    .select("profile,member", { count: "exact" })
    .eq("organization_id", organizationId)
    .eq("deleted", filter.deleted)
    .order("full_name")
    .order("user_id");
  const search = filter.query.trim().replaceAll(/[%,_().]/g, "");
  if (search)
    query = query.or(
      "full_name.ilike.%" + search + "%,email.ilike.%" + search + "%",
    );
  const start = (filter.page - 1) * PAGE_SIZE;
  const { data, error, count } = await query
    .range(start, start + PAGE_SIZE - 1)
    .abortSignal(signal);
  return {
    rows: z.array(userRowSchema).parse(requireData(data, error)),
    count: count ?? 0,
  };
}

export async function loadCompany(
  organizationId: string,
  companyId: string,
  signal: AbortSignal,
) {
  const { data, error } = await requireBrowserClient()
    .from("companies")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", companyId)
    .abortSignal(signal)
    .maybeSingle();
  if (error) throw normalizeOperationError(error);
  return data;
}

export async function loadMemberAccess(
  organizationId: string,
  memberId: string,
  signal: AbortSignal,
) {
  const client = requireBrowserClient();
  const grants = await client
    .from("access_grants")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("member_id", memberId)
    .order("created_at")
    .abortSignal(signal);
  const rows = requireData(grants.data, grants.error);
  const overrides = rows.length
    ? await client
        .from("grant_permission_overrides")
        .select("*")
        .eq("organization_id", organizationId)
        .in(
          "grant_id",
          rows.map((grant) => grant.id),
        )
        .abortSignal(signal)
    : { data: [], error: null };
  return {
    grants: rows,
    overrides: requireData(overrides.data, overrides.error),
  };
}

export async function loadModuleSettings(
  organizationId: string,
  companyId: string,
  signal: AbortSignal,
) {
  const { data, error } = await requireBrowserClient()
    .from("company_module_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("company_id", companyId)
    .abortSignal(signal);
  return requireData(data, error);
}

export async function callAdmin(
  endpoint: string,
  method: string,
  body: unknown,
) {
  try {
    const response = await fetch(endpoint, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data: unknown = await response.json();
    return decodeRpc(data, null, commandResultSchema);
  } catch (error) {
    return failure(normalizeOperationError(error));
  }
}

export async function listOperations(
  organizationId: string,
  signal: AbortSignal,
) {
  const result = await requireBrowserClient()
    .rpc("h02_operation_status", { p_organization_id: organizationId })
    .abortSignal(signal);
  return operationStatusSchema.parse(requireData(result.data, result.error));
}

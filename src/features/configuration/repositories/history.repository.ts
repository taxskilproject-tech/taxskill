import { z } from "zod";

import type { SoftDeleteEntity } from "@/domain/access/types/access.types";
import {
  requireBrowserClient,
  requireData,
} from "@/features/access/repositories/access.repository";
import type { DeletedRecord } from "@/features/configuration/types/configuration.types";

const rowSchema = z.object({
  id: z.uuid().optional(),
  user_id: z.uuid().optional(),
  revision: z.number().int(),
  name: z.string().optional(),
  full_name: z.string().optional(),
  legal_name: z.string().optional(),
  deleted_at: z.string(),
  deletion_reason: z.string(),
});

export async function listDeleted(
  organizationId: string,
  entity: SoftDeleteEntity,
  signal: AbortSignal,
): Promise<DeletedRecord[]> {
  const client = requireBrowserClient();
  let query = client.from(entity).select("*").not("deleted_at", "is", null);
  if (entity === "organizations")
    query = query.filter("id", "eq", organizationId);
  else if (entity === "profiles") {
    const result = await client
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .abortSignal(signal);
    const ids = requireData(result.data, result.error).map(
      (member) => member.user_id,
    );
    if (!ids.length) return [];
    query = query.in("user_id", ids);
  } else query = query.filter("organization_id", "eq", organizationId);
  const result = await query
    .order("deleted_at", { ascending: false })
    .limit(100)
    .abortSignal(signal);
  return z
    .array(rowSchema)
    .parse(requireData(result.data, result.error))
    .map((row) => ({
      id: row.id ?? row.user_id!,
      revision: row.revision,
      label:
        row.name ?? row.legal_name ?? row.full_name ?? row.id ?? "Registro",
      reason: row.deletion_reason,
      deletedAt: row.deleted_at,
    }));
}

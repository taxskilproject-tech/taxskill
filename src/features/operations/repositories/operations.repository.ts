import { requireBrowserClient } from "@/features/access/repositories/access.repository";
import { operationsSnapshotSchema } from "@/features/operations/contracts/operations.schema";
import { decodeRpc } from "@/lib/supabase/utils/decode-rpc";

export async function loadOperations(
  organizationId: string,
  signal: AbortSignal,
) {
  const result = await requireBrowserClient()
    .rpc("h08_health", { p_organization_id: organizationId })
    .abortSignal(signal);
  const parsed = decodeRpc(result.data, result.error, operationsSnapshotSchema);
  if (!parsed.ok) throw parsed.error;
  return parsed.data;
}

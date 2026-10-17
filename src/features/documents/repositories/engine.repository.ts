import { normalizeOperationError } from "@/domain/common/utils/normalize-operation-error";
import { failure } from "@/domain/common/utils/operation-result";
import { calendarPreviewSchema } from "@/domain/documents/contracts/engine.schema";
import {
  asJson,
  requireBrowserClient,
} from "@/features/access/repositories/access.repository";
import { decodeRpc } from "@/lib/supabase/utils/decode-rpc";

export async function previewRule(
  organizationId: string,
  input: Record<string, unknown>,
) {
  try {
    const result = await requireBrowserClient().rpc("h04_preview", {
      p_organization_id: organizationId,
      p_input: asJson(input),
    });
    return decodeRpc(result.data, result.error, calendarPreviewSchema);
  } catch (cause) {
    return failure(normalizeOperationError(cause));
  }
}

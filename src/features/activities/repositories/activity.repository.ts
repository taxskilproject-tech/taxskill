import type { z } from "zod";

import {
  asJson,
  requireBrowserClient,
} from "@/features/access/repositories/access.repository";
import { decodeRpc } from "@/lib/supabase/utils/decode-rpc";

export async function queryActivities<T>(
  organizationId: string,
  resource: string,
  input: Record<string, unknown>,
  schema: z.ZodType<T>,
  signal: AbortSignal,
) {
  const response = await requireBrowserClient()
    .rpc("h06_query", {
      p_organization_id: organizationId,
      p_resource: resource,
      p_input: asJson(input),
    })
    .abortSignal(signal);
  const result = decodeRpc(response.data, response.error, schema);
  if (!result.ok) throw result.error;
  return result.data;
}

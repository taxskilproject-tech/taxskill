import type { z } from "zod";

import { normalizeOperationError } from "@/domain/common/utils/normalize-operation-error";
import { failure } from "@/domain/common/utils/operation-result";
import { workerResultSchema } from "@/domain/workers/contracts/worker.schema";
import type {
  WorkerOperation,
  WorkerQueryInput,
} from "@/domain/workers/types/worker.types";
import {
  asJson,
  requireBrowserClient,
} from "@/features/access/repositories/access.repository";
import { decodeRpc } from "@/lib/supabase/utils/decode-rpc";

export async function workerCommand(
  organizationId: string,
  requestId: string,
  operation: WorkerOperation,
  input: Record<string, unknown>,
) {
  try {
    const response = await requireBrowserClient().rpc("h03_command", {
      p_organization_id: organizationId,
      p_request_id: requestId,
      p_operation: operation,
      p_input: asJson(input),
    });
    return decodeRpc(response.data, response.error, workerResultSchema);
  } catch (cause) {
    return failure(normalizeOperationError(cause));
  }
}
export async function queryWorkers<T>(
  organizationId: string,
  resource: string,
  input: WorkerQueryInput,
  schema: z.ZodType<T>,
  signal: AbortSignal,
) {
  const response = await requireBrowserClient()
    .rpc("h05_query", {
      p_organization_id: organizationId,
      p_resource: resource,
      p_input: asJson(input),
    })
    .abortSignal(signal);
  const result = decodeRpc(response.data, response.error, schema);
  if (!result.ok) throw result.error;
  return result.data;
}

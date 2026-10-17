import { z } from "zod";

import { normalizeOperationError } from "@/domain/common/utils/normalize-operation-error";
import { failure } from "@/domain/common/utils/operation-result";
import {
  documentResultSchema,
  intentSchema,
} from "@/domain/documents/contracts/document.schema";
import type {
  DocumentOperation,
  DocumentQueryInput,
} from "@/domain/documents/types/document.types";
import {
  asJson,
  requireBrowserClient,
  requireData,
} from "@/features/access/repositories/access.repository";
import { decodeRpc } from "@/lib/supabase/utils/decode-rpc";

export async function queryDocuments<T>(
  organizationId: string,
  resource: string,
  input: DocumentQueryInput,
  schema: z.ZodType<T>,
  signal: AbortSignal,
) {
  const result = await requireBrowserClient()
    .rpc("h03_query", {
      p_organization_id: organizationId,
      p_resource: resource,
      p_input: asJson(input),
    })
    .abortSignal(signal);
  const decoded = decodeRpc(result.data, result.error, schema);
  if (!decoded.ok) throw decoded.error;
  return decoded.data;
}
export async function documentCommand(
  organizationId: string,
  requestId: string,
  operation: DocumentOperation,
  input: Record<string, unknown>,
) {
  try {
    const result = await requireBrowserClient().rpc("h03_command", {
      p_organization_id: organizationId,
      p_request_id: requestId,
      p_operation: operation,
      p_input: asJson(input),
    });
    return decodeRpc(result.data, result.error, documentResultSchema);
  } catch (cause) {
    return failure(normalizeOperationError(cause));
  }
}
export async function loadUploadIntent(intentId: string, signal: AbortSignal) {
  const result = await requireBrowserClient()
    .from("upload_intents")
    .select(
      "id,deliverable_id,cycle_id,original_name,declared_bytes,expected_deliverable_revision,state,expires_at,error_code,confirmed_version_id",
    )
    .eq("id", intentId)
    .abortSignal(signal)
    .single();
  return intentSchema.parse(requireData(result.data, result.error));
}
export async function invokeDocumentEdge<T>(
  input: Record<string, unknown>,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
) {
  const result = await requireBrowserClient().functions.invoke(
    "document-operations",
    { body: input, signal },
  );
  if (result.error) {
    const response = result.error.context;
    const errorBody =
      response instanceof Response
        ? await response.json().catch(() => null)
        : null;
    const error = z
      .object({ error: z.object({ code: z.string() }) })
      .safeParse(errorBody);
    throw normalizeOperationError(
      error.success ? error.data.error : result.error,
    );
  }
  const decoded = decodeRpc(result.data, null, schema);
  if (!decoded.ok) throw decoded.error;
  return decoded.data;
}

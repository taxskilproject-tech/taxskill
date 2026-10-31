import type { z } from "zod";

import type { OperationResult } from "@/domain/common/types/operation.types";
import { normalizeOperationError } from "@/domain/common/utils/normalize-operation-error";
import { failure, success } from "@/domain/common/utils/operation-result";
import {
  SUNAT_ACTION_POLL_INTERVAL_MS,
  SUNAT_DISPATCH_RETRY_MS,
  SUNAT_ERROR_MESSAGES,
  SUNAT_MANUAL_WAIT_MS,
} from "@/domain/sunat/constants/sunat";
import {
  sunatCommandResultSchema,
  sunatDispatchAcceptedSchema,
  sunatJobSchema,
  sunatSignedFileSchema,
} from "@/domain/sunat/contracts/sunat.schema";
import type {
  SunatCommandResult,
  SunatOperation,
} from "@/domain/sunat/types/sunat.types";
import { requireBrowserClient } from "@/features/access/repositories/access.repository";
import { asJson } from "@/lib/supabase/utils/as-json";
import { decodeRpc } from "@/lib/supabase/utils/decode-rpc";

export async function querySunat<T>(
  organizationId: string,
  resource: string,
  input: Record<string, unknown>,
  schema: z.ZodType<T>,
  signal: AbortSignal,
): Promise<T> {
  const response = await requireBrowserClient()
    .rpc("h10_query", {
      p_organization_id: organizationId,
      p_resource: resource,
      p_input: asJson(input),
    })
    .abortSignal(signal);
  const result = decodeRpc(response.data, response.error, schema);
  if (!result.ok) throw result.error;
  return result.data;
}

export async function commandSunat(
  organizationId: string,
  requestId: string,
  operation: SunatOperation,
  input: Record<string, unknown>,
) {
  const response = await requireBrowserClient().rpc("h10_command", {
    p_organization_id: organizationId,
    p_request_id: requestId,
    p_operation: operation,
    p_input: asJson(input),
  });
  return decodeRpc(response.data, response.error, sunatCommandResultSchema);
}

export async function callSunatApi<T>(
  endpoint: string,
  input: unknown,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<OperationResult<T>> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
      signal,
    });
    return decodeRpc(await response.json(), null, schema);
  } catch (error) {
    return failure(normalizeOperationError(error));
  }
}

function pollDelay(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new Error("CONSULTATION_ABORTED"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, SUNAT_ACTION_POLL_INTERVAL_MS);
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
  });
}

export async function waitForSunatJob(
  result: SunatCommandResult,
  signal: AbortSignal,
): Promise<OperationResult<SunatCommandResult>> {
  if (!result.job_id) return success(result);
  const deadline = Date.now() + SUNAT_MANUAL_WAIT_MS;
  let nextDispatchAt = 0;
  while (!signal.aborted && Date.now() < deadline) {
    const response = await requireBrowserClient()
      .from("sunat_jobs")
      .select("*")
      .eq("id", result.job_id)
      .abortSignal(signal)
      .maybeSingle();
    if (response.error || !response.data)
      return failure({
        code: "FORBIDDEN",
        message: "La consulta ya no está disponible. Revisa tu acceso.",
      });
    const job = sunatJobSchema.safeParse(response.data);
    if (!job.success) return failure(normalizeOperationError(null));
    if (job.data.state === "complete")
      return success({ ...result, state: "complete" });
    if (["failed", "partial", "cancelled"].includes(job.data.state))
      return failure({
        code: "DEPENDENCY_UNAVAILABLE",
        message:
          SUNAT_ERROR_MESSAGES[job.data.error_code ?? ""] ??
          "La consulta no se completó. Revisa su estado antes de reintentar.",
      });
    const shouldDispatch: boolean =
      job.data.state === "queued" && Date.now() >= nextDispatchAt;
    const started = shouldDispatch
      ? await callSunatApi(
          "/api/sunat/run",
          {
            organization_id: response.data.organization_id,
            job_id: job.data.id,
          },
          sunatDispatchAcceptedSchema,
          signal,
        )
      : null;
    if (started && !started.ok) return started;
    if (shouldDispatch) nextDispatchAt = Date.now() + SUNAT_DISPATCH_RETRY_MS;
    await pollDelay(signal);
  }
  return failure({
    code: "DEPENDENCY_UNAVAILABLE",
    message:
      "La consulta sigue pendiente. Puedes revisar su estado en la bandeja.",
  });
}

export async function prepareSunatDownload(
  organizationId: string,
  attachmentId: string,
) {
  return callSunatApi(
    "/api/sunat/download",
    {
      organization_id: organizationId,
      attachment_id: attachmentId,
      request_id: crypto.randomUUID(),
    },
    sunatSignedFileSchema,
  );
}

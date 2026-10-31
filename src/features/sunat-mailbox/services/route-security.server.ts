import "server-only";

import {
  getOperationHttpStatus,
  normalizeOperationError,
} from "@/domain/common/utils/normalize-operation-error";
import { failure, success } from "@/domain/common/utils/operation-result";
import { sessionContextSchema } from "@/features/auth/contracts/session.schema";
import { enforceRateLimit } from "@/features/operations/repositories/rate-limit.server";
import type { SunatRouteAuthorization } from "@/features/sunat-mailbox/types/server.types";
import { isSameOrigin } from "@/features/users/utils/is-same-origin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin.server";
import { createSupabaseSessionClient } from "@/lib/supabase/session.server";
import { decodeRpc } from "@/lib/supabase/utils/decode-rpc";

const MAX_BODY_BYTES = 16384;

export async function readSunatRequest(request: Request): Promise<unknown> {
  if (!isSameOrigin(request)) throw { code: "FORBIDDEN" };
  return readSunatJsonBody(request);
}

export async function readSunatJsonBody(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw { code: "VALIDATION_ERROR" };
  const reader = request.body?.getReader();
  if (!reader) throw { code: "VALIDATION_ERROR" };
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw { code: "VALIDATION_ERROR" };
    }
    chunks.push(chunk.value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw { code: "VALIDATION_ERROR" };
  }
}

export async function authorizeSunatRoute(
  organizationId: string,
  adminRequired: boolean,
): Promise<SunatRouteAuthorization> {
  const session = await createSupabaseSessionClient();
  if (!session.ok) throw session.error;
  const user = await session.data.auth.getUser();
  if (user.error || !user.data.user) throw { code: "UNAUTHENTICATED" };
  const response = await session.data.rpc("h02_context");
  const context = decodeRpc(
    response.data,
    response.error,
    sessionContextSchema,
  );
  if (!context.ok) throw context.error;
  if (
    context.data.organization.id !== organizationId ||
    context.data.member.member_type !== "internal" ||
    (adminRequired && !context.data.member.is_admin)
  )
    throw { code: "FORBIDDEN" };
  const admin = createSupabaseAdminClient();
  if (!admin.ok) throw admin.error;
  await enforceRateLimit(
    admin.data,
    "admin",
    "h10:" + (adminRequired ? "credentials:" : "download:") + user.data.user.id,
  );
  return { context: context.data, session: session.data, admin: admin.data };
}

export function sunatRouteSuccess<T>(data: T) {
  return Response.json(success(data), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
export function sunatRouteError(cause: unknown) {
  const error = normalizeOperationError(cause);
  return Response.json(failure(error), {
    status: getOperationHttpStatus(error.code),
    headers: { "Cache-Control": "private, no-store" },
  });
}

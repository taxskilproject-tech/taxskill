import "server-only";

import {
  adminEnvelopeSchema,
  createUserSchema,
  enabledSchema,
  passwordSchema,
} from "@/domain/access/contracts/access.schema";
import { OPERATION_MESSAGES } from "@/domain/common/constants/operation-errors";
import {
  getOperationHttpStatus,
  isRecord,
  normalizeOperationError,
} from "@/domain/common/utils/normalize-operation-error";
import { failure, success } from "@/domain/common/utils/operation-result";
import { sessionContextSchema } from "@/features/auth/contracts/session.schema";
import { enforceRateLimit } from "@/features/operations/repositories/rate-limit.server";
import { executeAdminOperation } from "@/features/users/services/admin-operation.server";
import { fingerprintInput } from "@/features/users/services/fingerprint.server";
import type { AdminRouteInput } from "@/features/users/types/admin.types";
import { isSameOrigin } from "@/features/users/utils/is-same-origin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin.server";
import { createSupabaseSessionClient } from "@/lib/supabase/session.server";
import type { AppSupabaseClient } from "@/lib/supabase/types/client.types";
import { decodeRpc } from "@/lib/supabase/utils/decode-rpc";

const MAX_BODY_BYTES = 32000;

async function verifyTarget(
  client: AppSupabaseClient,
  organizationId: string,
  userId?: string,
) {
  if (!userId) return;
  const target = await client
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (target.error || !target.data) throw new Error("NOT_FOUND");
}

function responseError(cause: unknown) {
  const message =
    cause instanceof Error
      ? cause.message
      : isRecord(cause)
        ? cause.message
        : undefined;
  const error = normalizeOperationError(
    typeof message === "string" && Object.hasOwn(OPERATION_MESSAGES, message)
      ? { code: message }
      : cause,
  );
  return Response.json(failure(error), {
    status: getOperationHttpStatus(error.code),
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function handleAdminRoute({
  request,
  operation,
  userId,
}: AdminRouteInput) {
  try {
    if (!isSameOrigin(request)) throw new Error("FORBIDDEN");
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new Error("VALIDATION_ERROR");
    const body = await request.text();
    if (Buffer.byteLength(body) > MAX_BODY_BYTES)
      throw new Error("VALIDATION_ERROR");
    let raw: unknown;
    try {
      raw = JSON.parse(body);
    } catch {
      throw new Error("VALIDATION_ERROR");
    }
    const parsed = adminEnvelopeSchema.safeParse(
      isRecord(raw) ? { ...raw, operation, user_id: userId } : raw,
    );
    if (!parsed.success) throw new Error("VALIDATION_ERROR");
    const envelope = parsed.data;
    const input = (
      operation === "CreateUser"
        ? createUserSchema
        : operation === "SetUserPassword"
          ? passwordSchema
          : enabledSchema
    ).safeParse(envelope.input);
    if (!input.success) throw new Error("VALIDATION_ERROR");
    envelope.input = input.data;
    const connection = await createSupabaseSessionClient();
    if (!connection.ok) throw connection.error;
    const verified = await connection.data.auth.getUser();
    if (verified.error || !verified.data.user)
      throw new Error("UNAUTHENTICATED");
    if (operation === "SetUserEnabled" && userId === verified.data.user.id)
      throw new Error("FORBIDDEN");
    const contextResult = await connection.data.rpc("h02_context");
    const context = decodeRpc(
      contextResult.data,
      contextResult.error,
      sessionContextSchema,
    );
    if (!context.ok) throw context.error;
    if (
      !context.data.member.is_admin ||
      context.data.organization.id !== envelope.organization_id
    )
      throw new Error("FORBIDDEN");
    await verifyTarget(connection.data, envelope.organization_id, userId);
    const fingerprint = fingerprintInput(
      envelope,
      process.env.IDEMPOTENCY_HMAC_KEY ?? "",
    );
    const admin = createSupabaseAdminClient();
    if (!admin.ok) throw admin.error;
    await enforceRateLimit(admin.data, "admin", verified.data.user.id);
    const result = await executeAdminOperation({
      client: admin.data,
      envelope,
      actorId: verified.data.user.id,
      fingerprint,
    });
    return Response.json(success(result), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return responseError(error);
  }
}

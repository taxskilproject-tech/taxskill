import "server-only";

import {
  commandResultSchema,
  createUserSchema,
  enabledSchema,
  passwordSchema,
} from "@/domain/access/contracts/access.schema";
import { adminEntrySchema } from "@/features/users/contracts/admin-entry.schema";
import type {
  AdminEntry,
  AdminExecution,
} from "@/features/users/types/admin.types";
import type { Json } from "@/lib/supabase/types/database.types";

function safeInput(input: Record<string, unknown>): Json {
  return JSON.parse(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(input).filter(([key]) => key !== "password"),
      ),
    ),
  );
}

async function ensureIdentity(execution: AdminExecution, entry: AdminEntry) {
  const input = createUserSchema.parse(execution.envelope.input);
  const existing = await execution.client.auth.admin.getUserById(
    entry.external_identity_id,
  );
  if (existing.data.user) {
    if (
      existing.data.user.email !== input.email ||
      existing.data.user.app_metadata.provisioning_request_id !==
        execution.envelope.request_id
    )
      throw new Error("CONFLICT");
    return;
  }
  if (existing.error && existing.error.status !== 404)
    throw new Error("DEPENDENCY_UNAVAILABLE");
  const created = await execution.client.auth.admin.createUser({
    id: entry.external_identity_id,
    email: input.email,
    password: input.password,
    email_confirm: true,
    ban_duration: "876000h",
    app_metadata: { provisioning_request_id: execution.envelope.request_id },
  });
  if (created.error)
    throw new Error(
      created.error.code === "email_exists"
        ? "CONFLICT"
        : "DEPENDENCY_UNAVAILABLE",
    );
}

async function performExternalOperation(
  execution: AdminExecution,
  entry: AdminEntry,
) {
  const { client, envelope } = execution;
  if (envelope.operation === "CreateUser")
    await ensureIdentity(execution, entry);
  const stage = await client.rpc("h02_admin_stage", {
    p_operation_id: entry.id,
    p_input: safeInput(envelope.input),
  });
  if (stage.error) throw stage.error;
  if (envelope.operation === "SetUserPassword") {
    const input = passwordSchema.parse(envelope.input);
    const result = await client.auth.admin.updateUserById(
      entry.external_identity_id,
      { password: input.password },
    );
    if (result.error) throw new Error("DEPENDENCY_UNAVAILABLE");
    return;
  }
  const enabled =
    envelope.operation === "CreateUser" ||
    enabledSchema.parse(envelope.input).enabled;
  const result = await client.auth.admin.updateUserById(
    entry.external_identity_id,
    { ban_duration: enabled ? "none" : "876000h" },
  );
  if (result.error) throw new Error("DEPENDENCY_UNAVAILABLE");
}

export async function executeAdminOperation(execution: AdminExecution) {
  const { client, envelope, actorId, fingerprint } = execution;
  const reserved = await client.rpc("h02_admin_prepare", {
    p_actor_id: actorId,
    p_organization_id: envelope.organization_id,
    p_request_id: envelope.request_id,
    p_operation: envelope.operation,
    p_input_hash: fingerprint,
    ...(envelope.user_id ? { p_target_id: envelope.user_id } : {}),
  });
  if (reserved.error) throw reserved.error;
  const entry = adminEntrySchema.parse(reserved.data);
  if (entry.status === "completed")
    return commandResultSchema.parse(entry.result);
  try {
    await performExternalOperation(execution, entry);
    const finished = await client.rpc("h02_admin_finish", {
      p_operation_id: entry.id,
      p_input: safeInput(envelope.input),
    });
    if (finished.error) throw finished.error;
    return commandResultSchema.parse(finished.data);
  } catch (error) {
    const recorded = await client.rpc("h02_admin_fail", {
      p_operation_id: entry.id,
    });
    if (recorded.error) throw new Error("DEPENDENCY_UNAVAILABLE");
    throw error;
  }
}

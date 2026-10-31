import { createHmac, randomUUID } from "node:crypto";
import "server-only";

import {
  saveSunatCredentialsSchema,
  sunatCommandResultSchema,
  sunatWorkspaceSchema,
} from "@/domain/sunat/contracts/sunat.schema";
import {
  encryptSunatCredentials,
  parseSunatKeyring,
} from "@/features/sunat-mailbox/services/credentials-crypto.server";
import {
  authorizeSunatRoute,
  readSunatRequest,
  sunatRouteError,
  sunatRouteSuccess,
} from "@/features/sunat-mailbox/services/route-security.server";
import { asJson } from "@/lib/supabase/utils/as-json";
import { decodeRpc } from "@/lib/supabase/utils/decode-rpc";

export async function saveSunatCredentialsRoute(
  request: Request,
): Promise<Response> {
  try {
    const input = saveSunatCredentialsSchema.safeParse(
      await readSunatRequest(request),
    );
    if (!input.success) throw { code: "VALIDATION_ERROR" };
    const { context, session, admin } = await authorizeSunatRoute(
      input.data.organization_id,
      true,
    );
    const response = await session.rpc("h10_query", {
      p_organization_id: context.organization.id,
      p_resource: "connection_context",
      p_input: { company_id: input.data.company_id },
    });
    const workspace = decodeRpc(
      response.data,
      response.error,
      sunatWorkspaceSchema,
    );
    if (!workspace.ok) throw workspace.error;
    const connectionId = workspace.data.connection?.id ?? randomUUID();
    const credentialVersion =
      (workspace.data.connection?.credential_version ?? 0) + 1;
    const keys = parseSunatKeyring(
      process.env.SUNAT_CREDENTIALS_CURRENT_KEY,
      process.env.SUNAT_CREDENTIALS_KEYS,
    );
    const encrypted = encryptSunatCredentials(
      {
        ruc: workspace.data.company.ruc.trim(),
        username: input.data.sol_username,
        password: input.data.sol_password,
      },
      {
        organization_id: context.organization.id,
        company_id: input.data.company_id,
        connection_id: connectionId,
        credential_version: credentialVersion,
      },
      keys,
    );
    const hmacKey = process.env.IDEMPOTENCY_HMAC_KEY;
    if (!hmacKey || !/^[0-9a-f]{64}$/i.test(hmacKey))
      throw { code: "DEPENDENCY_UNAVAILABLE" };
    const fingerprint = createHmac("sha256", Buffer.from(hmacKey, "hex"))
      .update(JSON.stringify([context.profile.user_id, input.data]))
      .digest("hex");
    const saved = await admin.rpc("h10_store_credentials", {
      p_input: asJson({
        organization_id: context.organization.id,
        actor_id: context.profile.user_id,
        session_id: context.session_id,
        company_id: input.data.company_id,
        request_id: input.data.request_id,
        expected_revision: input.data.expected_revision,
        connection_id: connectionId,
        credential_version: credentialVersion,
        consent_version: 1,
        encrypted,
        fingerprint,
      }),
    });
    const result = decodeRpc(saved.data, saved.error, sunatCommandResultSchema);
    if (!result.ok) throw result.error;
    return sunatRouteSuccess(result.data);
  } catch (error) {
    return sunatRouteError(error);
  }
}

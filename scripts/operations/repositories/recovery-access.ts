import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { signedDownloadSchema } from "../../../src/domain/documents/contracts/document.schema";
import type { Database } from "../../../src/lib/supabase/types/database.types";
import { scriptResult } from "../../utils/script-result";
import type { RecoveryAccess } from "../types/recovery.types";
import { backupHash } from "../utils/backup-crypto";
import { assertRecoverySource } from "./recovery-project";

export async function verifyRecoveryAccess(
  input: RecoveryAccess,
): Promise<string> {
  assertRecoverySource(input.target);
  const password = randomBytes(24).toString("base64url");
  const created = await input.admin.auth.admin.createUser({
    email: `h08-file-${randomUUID()}@example.test`,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user)
    throw new Error("Identidad aislada incompleta.");
  const user = created.data.user;
  const profile = await input.admin.from("profiles").insert({
    user_id: user.id,
    email: user.email ?? "",
    full_name: "H08 cliente aislado",
    provisioning_status: "ready",
  });
  if (profile.error) throw new Error("Perfil aislado incompleto.");
  const member = scriptResult(
    await input.admin
      .from("organization_members")
      .insert({
        organization_id: input.organizationId,
        user_id: user.id,
        member_type: "client",
        is_admin: false,
      })
      .select("id")
      .single(),
    "Membresía aislada incompleta.",
  );
  const role = scriptResult(
    await input.admin
      .from("roles")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("audience", "client")
      .limit(1)
      .single(),
    "Rol cliente aislado no disponible.",
  );
  const grant = scriptResult(
    await input.admin
      .from("access_grants")
      .insert({
        organization_id: input.organizationId,
        member_id: member.id,
        scope: "company",
        company_id: input.companyId,
        module: "tributario",
        role_id: role.id,
      })
      .select("id")
      .single(),
    "Permiso de descarga aislado no disponible.",
  );
  const client = createClient<Database>(input.target.url, input.publicKey, {
    auth: { persistSession: false },
  });
  const login = await client.auth.signInWithPassword({
    email: user.email ?? "",
    password,
  });
  if (login.error) throw new Error("Login cliente aislado incompleto.");
  const body = {
    action: "download",
    organization_id: input.organizationId,
    version_id: input.versionId,
    request_id: randomUUID(),
  };
  const downloaded = await client.functions.invoke("document-operations", {
    body,
  });
  if (downloaded.error) {
    const response = downloaded.error.context;
    const parsed = z
      .object({ error: z.object({ code: z.string().regex(/^[A-Z_]+$/) }) })
      .safeParse(response instanceof Response ? await response.json() : null);
    throw new Error(
      "La descarga cliente autorizada fue rechazada: " +
        (parsed.success ? parsed.data.error.code : "DEPENDENCY_UNAVAILABLE"),
    );
  }
  const signed = z
    .object({ ok: z.literal(true), data: signedDownloadSchema })
    .parse(downloaded.data).data;
  // Auxiliary Edge returns its internal origin; the test uses only the fixed isolated API.
  const url =
    input.target.url +
    new URL(signed.url).pathname +
    new URL(signed.url).search;
  const bytes = await fetch(url);
  if (
    !bytes.ok ||
    signed.expires_in !== 60 ||
    backupHash(new Uint8Array(await bytes.arrayBuffer())) !==
      backupHash(input.bytes)
  )
    throw new Error("Descarga breve o integridad inválidas.");
  const version = scriptResult(
    await input.admin
      .from("document_versions")
      .select("storage_path")
      .eq("id", input.versionId)
      .single(),
    "Archivo aislado no disponible.",
  );
  const raw = await client.storage
    .from("documents")
    .createSignedUrl(version.storage_path, 3600);
  if (!raw.error) throw new Error("Storage permitió eludir auditoría y TTL.");
  const revoked = await input.admin
    .from("access_grants")
    .update({ active: false })
    .eq("id", grant.id);
  if (revoked.error) throw new Error("Retirada aislada incompleta.");
  const denied = await client.functions.invoke("document-operations", {
    body: { ...body, request_id: randomUUID() },
  });
  if (!denied.error)
    throw new Error("La retirada de permiso no bloqueó una descarga nueva.");
  await client.auth.signOut({ scope: "local" });
  return url;
}

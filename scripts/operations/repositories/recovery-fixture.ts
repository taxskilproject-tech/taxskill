import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";

import { detailSchema } from "../../../src/domain/documents/contracts/document.schema";
import type { Database } from "../../../src/lib/supabase/types/database.types";
import { scriptResult } from "../../utils/script-result";
import type {
  RecoveryDatabase,
  RecoveryFixtureCommand,
} from "../types/recovery.types";
import { verifyRecoveryAccess } from "./recovery-access";
import { assertRecoverySource } from "./recovery-project";

async function command(input: RecoveryFixtureCommand): Promise<string> {
  const result = await input.client.rpc(input.gateway, {
    p_organization_id: input.organizationId,
    p_request_id: randomUUID(),
    p_operation: input.operation,
    p_input: input.input,
  });
  if (result.error)
    throw new Error("No se completó el fixture local: " + input.operation);
  return z
    .object({ ok: z.literal(true), data: z.object({ resource_id: z.uuid() }) })
    .parse(result.data).data.resource_id;
}
export async function createRecoveryFixture(
  target: RecoveryDatabase,
  publicKey: string,
) {
  assertRecoverySource(target);
  const admin = createClient<Database>(target.url, target.secret, {
    auth: { persistSession: false },
  });
  const email = `h08-recovery-${randomUUID()}@example.test`;
  const password = randomBytes(24).toString("base64url");
  const identity = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (identity.error || !identity.data.user)
    throw new Error("No se pudo crear la identidad del ensayo aislado.");
  const userId = identity.data.user.id;
  const organizationId = scriptResult(
    await admin.rpc("h02_bootstrap", {
      p_user_id: userId,
      p_name: "H08 recuperación ficticia",
    }),
    "Bootstrap aislado incompleto.",
  );
  const client = createClient<Database>(target.url, publicKey, {
    auth: { persistSession: false },
  });
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error || !login.data.session)
    throw new Error("Login del ensayo aislado incompleto.");
  const common = { client, organizationId };
  const companyId = await command({
    ...common,
    gateway: "h02_command",
    operation: "CreateOrUpdateCompany",
    input: {
      ruc: "20999999981",
      legal_name: "H08 empresa ficticia recuperable",
      control_start_date: "2026-10-17",
    },
  });
  const member = scriptResult(
    await admin
      .from("organization_members")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .single(),
    "Membresía aislada no disponible.",
  );
  const role = scriptResult(
    await admin
      .from("roles")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("code", "contador")
      .single(),
    "Rol aislado no disponible.",
  );
  await command({
    ...common,
    gateway: "h02_command",
    operation: "AssignAccess",
    input: {
      member_id: member.id,
      scope: "company",
      company_id: companyId,
      module: "tributario",
      role_id: role.id,
      active: true,
      overrides: [],
    },
  });
  await command({
    ...common,
    gateway: "h02_command",
    operation: "SaveModuleSettings",
    input: {
      company_id: companyId,
      module: "tributario",
      delivery_responsible_id: userId,
    },
  });
  for (const bucket of ["document-reception", "documents"]) {
    const created = await admin.storage.createBucket(bucket, {
      public: false,
      fileSizeLimit: 20_000_000,
    });
    if (created.error) throw new Error("No se pudo preparar Storage aislado.");
  }
  const documentType = await command({
    ...common,
    gateway: "h03_command",
    operation: "SaveDocumentType",
    input: {
      code: "h08-restore",
      name: "H08 documento recuperable",
      module: "tributario",
      suggested_formats: ["pdf"],
      active: true,
    },
  });
  const rule = await command({
    ...common,
    gateway: "h03_command",
    operation: "ConfigureRequirement",
    input: {
      document_type_id: documentType,
      company_id: companyId,
      title: "H08 archivo recuperable",
      deadline_offset_days: 7,
      allowed_formats: ["pdf"],
      max_file_bytes: 20_000_000,
      deliverable_specs: [
        {
          position_code: "documento",
          label: "Documento",
          display_order: 1,
          allowed_formats: ["pdf"],
          max_file_bytes: 20_000_000,
        },
      ],
    },
  });
  const obligation = await command({
    ...common,
    gateway: "h03_command",
    operation: "GenerateMonthly",
    input: { rule_id: rule },
  });
  const detailResult = await client.rpc("h03_query", {
    p_organization_id: organizationId,
    p_resource: "detail",
    p_input: { id: obligation },
  });
  const detail = z.object({ data: detailSchema }).parse(detailResult.data).data;
  const slot = detail.deliverables[0];
  const cycle = detail.cycles.find((item) => item.deliverable_id === slot.id);
  if (!cycle) throw new Error("No se pudo preparar ciclo recuperable.");
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText("H08 isolated recovery fixture");
  const bytes = await pdf.save();
  const intent = await command({
    ...common,
    gateway: "h03_command",
    operation: "CreateUploadIntent",
    input: {
      deliverable_id: slot.id,
      cycle_id: cycle.id,
      expected_revision: slot.revision,
      original_name: "h08-recovery.pdf",
      declared_bytes: bytes.length,
      declared_mime: "application/pdf",
    },
  });
  const prepared = await client.functions.invoke("document-operations", {
    body: { action: "prepare", intent_id: intent },
  });
  if (prepared.error)
    throw new Error("No se pudo preparar la carga real del ensayo.");
  const signed = z
    .object({
      data: z.object({
        bucket: z.string(),
        path: z.string(),
        token: z.string(),
      }),
    })
    .parse(prepared.data).data;
  const uploaded = await client.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, bytes, {
      contentType: "application/pdf",
    });
  if (uploaded.error)
    throw new Error("No se pudo transferir el PDF real del ensayo.");
  const finalized = await client.functions.invoke("document-operations", {
    body: { action: "finalize", intent_id: intent },
  });
  if (finalized.error || finalized.data?.ok !== true)
    throw new Error("No se pudo confirmar el PDF real del ensayo.");
  const version = scriptResult(
    await admin
      .from("document_versions")
      .select("id")
      .eq("upload_intent_id", intent)
      .single(),
    "Versión recuperable no disponible.",
  );
  const revised = scriptResult(
    await admin
      .from("deliverables")
      .select("revision")
      .eq("id", slot.id)
      .single(),
    "Revisión recuperable no disponible.",
  );
  await command({
    ...common,
    gateway: "h03_command",
    operation: "ApproveVersion",
    input: {
      deliverable_id: slot.id,
      version_id: version.id,
      expected_revision: revised.revision,
    },
  });
  const previousDownloadUrl = await verifyRecoveryAccess({
    target,
    publicKey,
    admin,
    organizationId,
    companyId,
    versionId: version.id,
    bytes,
  });
  return {
    previousDownloadUrl,
    admin,
    client,
    accessToken: login.data.session.access_token,
    email,
    password,
    organizationId,
  };
}

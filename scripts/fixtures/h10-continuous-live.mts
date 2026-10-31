import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { sessionContextSchema } from "../../src/features/auth/contracts/session.schema";
import type { Database } from "../../src/lib/supabase/types/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const base = process.env.APP_BASE_URL;
if (url !== "http://127.0.0.1:54431" || base !== "http://localhost:4003")
  throw new Error("H10_REQUIRES_ISOLATED_DOCKER");
const publicKey = z
  .string()
  .parse(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const serviceKey = z.string().parse(process.env.SUPABASE_SECRET_KEY);
const service = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false },
});
const credentials = z
  .object({ BOOTSTRAP_EMAIL: z.email(), BOOTSTRAP_PASSWORD: z.string() })
  .parse(parseEnv(readFileSync(".envs/local/bootstrap.env", "utf8")));
const client = createClient<Database>(url, publicKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const signed = await client.auth.signInWithPassword({
  email: credentials.BOOTSTRAP_EMAIL,
  password: credentials.BOOTSTRAP_PASSWORD,
});
if (signed.error) throw new Error("LOCAL_ADMIN_LOGIN_FAILED");
const response = await client.rpc("h02_context");
const context = z
  .object({ ok: z.literal(true), data: sessionContextSchema })
  .parse(response.data).data;
const company = context.companies.find((item) => item.ruc === "20000000901");
if (!company) throw new Error("H09_FIXTURE_REQUIRED");
const companyId = company.id;
const checks: string[] = [];
function checkResult(value: unknown, expected: boolean, code: string) {
  const allowed = z.object({ ok: z.literal(true) }).safeParse(value).success;
  if (allowed !== expected) throw new Error(code);
}
const input = { company_id: companyId, year: 2026, month: 10, page: 1 };
const workspace = await client.rpc("h10_query", {
  p_organization_id: context.organization.id,
  p_resource: "workspace",
  p_input: input,
});
if (!z.object({ ok: z.literal(true) }).safeParse(workspace.data).success)
  throw new Error("ADMIN_WORKSPACE_FAILED");
checks.push("Administrador accede a la empresa local autorizada");
const foreignOrigin = await fetch(base + "/api/sunat/credentials", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: "https://example.invalid",
  },
  body: "{}",
});
if (foreignOrigin.status !== 403) throw new Error("FOREIGN_ORIGIN_ACCEPTED");
checks.push("Origen ajeno rechazado antes de guardar credenciales");
const unauthenticated = await fetch(base + "/api/sunat/download", {
  method: "POST",
  headers: { "content-type": "application/json", origin: base },
  body: JSON.stringify({
    organization_id: context.organization.id,
    attachment_id: randomUUID(),
    request_id: randomUUID(),
  }),
});
if (unauthenticated.status !== 401)
  throw new Error("ANONYMOUS_DOWNLOAD_ALLOWED");
checks.push("Descarga anónima rechazada");
const identities = z
  .array(
    z.object({
      email: z.email(),
      password: z.string(),
      memberType: z.string(),
      roleCode: z.string(),
    }),
  )
  .parse(
    JSON.parse(readFileSync("test-results/local/h02-fixtures.json", "utf8")),
  );
for (const identity of identities) {
  const account = createClient<Database>(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const login = await account.auth.signInWithPassword(identity);
  if (login.error) throw new Error("LOCAL_PROFILE_LOGIN_FAILED");
  const result = await account.rpc("h02_context");
  const profile = z
    .object({ ok: z.literal(true), data: sessionContextSchema })
    .parse(result.data).data;
  const initial = await service
    .from("sunat_access_grants")
    .select("active,revision")
    .eq("company_id", companyId)
    .eq("member_id", profile.member.id)
    .maybeSingle();
  if (initial.error) throw new Error("LOCAL_GRANT_LOOKUP_FAILED");
  async function setAccess(allowed: boolean) {
    const current = await service
      .from("sunat_access_grants")
      .select("revision")
      .eq("company_id", companyId)
      .eq("member_id", profile.member.id)
      .maybeSingle();
    return client.rpc("h10_command", {
      p_organization_id: context.organization.id,
      p_request_id: randomUUID(),
      p_operation: "SetAccess",
      p_input: {
        company_id: companyId,
        member_id: profile.member.id,
        expected_revision: current.data?.revision ?? 0,
        allowed,
      },
    });
  }
  if (identity.memberType === "client") {
    const rejected = await setAccess(true);
    checkResult(rejected.data, false, "CLIENT_MAILBOX_GRANT_ACCEPTED");
    const denied = await account.rpc("h10_query", {
      p_organization_id: context.organization.id,
      p_resource: "workspace",
      p_input: input,
    });
    checkResult(denied.data, false, "CLIENT_MAILBOX_ALLOWED");
    checks.push("Cliente: asignación de buzón y consulta rechazadas");
    continue;
  }
  try {
    const granted = await setAccess(true);
    checkResult(granted.data, true, "INTERNAL_GRANT_FAILED");
    const allowed = await account.rpc("h10_query", {
      p_organization_id: context.organization.id,
      p_resource: "workspace",
      p_input: input,
    });
    checkResult(allowed.data, true, "AUTHORIZED_INTERNAL_DENIED");
    checks.push("Consulta autorizada por empresa: " + identity.roleCode);
    const other = context.companies.find((item) => item.id !== companyId);
    const otherCompanyId = z.uuid().parse(other?.id);
    const foreign = await account.rpc("h10_query", {
      p_organization_id: context.organization.id,
      p_resource: "workspace",
      p_input: { ...input, company_id: otherCompanyId },
    });
    checkResult(foreign.data, false, "FOREIGN_COMPANY_ALLOWED");
    checks.push("Empresa ajena rechazada: " + identity.roleCode);
    await setAccess(false);
    const revoked = await account.rpc("h10_query", {
      p_organization_id: context.organization.id,
      p_resource: "workspace",
      p_input: input,
    });
    checkResult(revoked.data, false, "REVOKED_GRANT_ALLOWED");
    checks.push("Revocación inmediata: " + identity.roleCode);
  } finally {
    const restored = await setAccess(initial.data?.active ?? false);
    checkResult(restored.data, true, "LOCAL_GRANT_RESTORE_FAILED");
  }
}
writeFileSync(
  "docs/hitos/evidencias/h10-continuous-access.json",
  JSON.stringify(
    {
      recorded_at: new Date().toISOString(),
      environment: "isolated_docker_54431",
      checks,
      passed: checks.length,
      presentation_worker_stopped: false,
      cloud_writes: false,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `H10: ${checks.length} comprobaciones de acceso aprobadas sin detener el simulador.`,
);

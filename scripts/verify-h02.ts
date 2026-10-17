import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { commandResultSchema } from "../src/domain/access/contracts/access.schema";
import { sessionContextSchema } from "../src/features/auth/contracts/session.schema";
import type { Database, Json } from "../src/lib/supabase/types/database.types";
import {
  LOCAL_DEMO_ENV_FILE,
  LOCAL_H02_FIXTURES_FILE,
  LOCAL_H02_RECOVERY_FILE,
  LOCAL_TEST_RESULTS_DIR,
} from "./constants/local-environment";
import type { DemoIdentity, HttpSession } from "./types/h02.types";
import { requireLocalTestEnvironment } from "./utils/require-local-test-environment";

const url = requireLocalTestEnvironment();
const baseUrl = "http://127.0.0.1:3001";
const demo = z
  .object({
    BOOTSTRAP_EMAIL: z.email(),
    BOOTSTRAP_PASSWORD: z.string().min(12),
  })
  .parse(parseEnv(readFileSync(LOCAL_DEMO_ENV_FILE, "utf8")));
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const admin = createClient<Database>(
  url,
  process.env.SUPABASE_SECRET_KEY ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function expect(value: unknown, label: string): asserts value {
  if (!value) throw new Error("H02: " + label);
}
function session(): HttpSession {
  const cookies = new Map<string, string>();
  const client = createServerClient<Database>(url, publicKey, {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (entries) =>
        entries.forEach(({ name, value }) => cookies.set(name, value)),
    },
  });
  return {
    client,
    cookie: () =>
      [...cookies].map(([name, value]) => name + "=" + value).join("; "),
  };
}
async function login(identity: HttpSession, email: string, password: string) {
  const result = await identity.client.auth.signInWithPassword({
    email,
    password,
  });
  expect(!result.error, "login de fixture");
  const context = await identity.client.rpc("h02_context");
  const envelope = z
    .object({ ok: z.literal(true), data: sessionContextSchema })
    .safeParse(context.data);
  expect(envelope.success, "contexto de fixture");
  return envelope.data.data;
}
async function http(
  identity: HttpSession | null,
  endpoint: string,
  input: unknown,
  method = "POST",
  origin = baseUrl,
) {
  const result = await fetch(baseUrl + endpoint, {
    method,
    headers: {
      Origin: origin,
      Cookie: identity?.cookie() ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const data: unknown = await result.json();
  return { status: result.status, data };
}
function errorCode(response: unknown) {
  return z
    .object({ ok: z.literal(false), error: z.object({ code: z.string() }) })
    .parse(response).error.code;
}
function completed(response: unknown) {
  return z
    .object({ ok: z.literal(true), data: commandResultSchema })
    .parse(response).data;
}
async function command(
  identity: HttpSession,
  org: string,
  operation: string,
  input: Json,
) {
  const result = await identity.client.rpc("h02_command", {
    p_organization_id: org,
    p_request_id: randomUUID(),
    p_operation: operation,
    p_input: input,
  });
  expect(!result.error, "transporte RPC");
  return completed(result.data);
}
function fixtures(): DemoIdentity[] {
  const path = LOCAL_H02_FIXTURES_FILE;
  if (existsSync(path))
    return z
      .array(
        z.object({
          email: z.email(),
          password: z.string(),
          requestId: z.uuid(),
          fullName: z.string(),
          memberType: z.enum(["internal", "client"]),
          roleCode: z.string(),
        }),
      )
      .parse(JSON.parse(readFileSync(path, "utf8")));
  const definitions = [
    { code: "contador", name: "Contador H02", type: "internal" },
    { code: "supervisor", name: "Supervisor H02", type: "internal" },
    { code: "cliente", name: "Cliente H02", type: "client" },
  ] as const;
  const entries = definitions.map((item) => ({
    email: item.code + ".h02@example.test",
    password: randomBytes(24).toString("base64url"),
    requestId: randomUUID(),
    fullName: item.name,
    memberType: item.type,
    roleCode: item.code,
  }));
  mkdirSync(LOCAL_TEST_RESULTS_DIR, { recursive: true });
  writeFileSync(path, JSON.stringify(entries), { flag: "wx" });
  return entries;
}

async function verifyPublicSignupDisabled() {
  const client = createClient<Database>(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await client.auth.signUp({
    email: `self-register-blocked-${randomUUID()}@example.test`,
    password: randomBytes(24).toString("base64url"),
  });
  expect(
    result.error?.code === "signup_disabled" && !result.data.user,
    "registro público deshabilitado con proveedor de contraseña activo",
  );
}

async function main() {
  await verifyPublicSignupDisabled();
  const actor = session();
  const context = await login(
    actor,
    demo.BOOTSTRAP_EMAIL,
    demo.BOOTSTRAP_PASSWORD,
  );
  const org = context.organization.id;
  let companies = await admin
    .from("companies")
    .select("*")
    .eq("organization_id", org)
    .is("deleted_at", null)
    .order("ruc");
  expect(!companies.error, "consulta empresas");
  if (!companies.data.length)
    await command(actor, org, "CreateOrUpdateCompany", {
      ruc: "20000000001",
      legal_name: "Empresa de demostración H02",
      status: "active",
      control_start_date: "2026-10-14",
    });
  if (!companies.data.some((item) => item.ruc === "20000000002"))
    await command(actor, org, "CreateOrUpdateCompany", {
      ruc: "20000000002",
      legal_name: "Segunda empresa de demostración H02",
      status: "active",
      control_start_date: "2026-10-14",
    });
  companies = await admin
    .from("companies")
    .select("*")
    .eq("organization_id", org)
    .is("deleted_at", null)
    .order("ruc");
  expect(
    companies.data && companies.data.length >= 2,
    "dos empresas de demostración",
  );
  const roles = await admin
    .from("roles")
    .select("*")
    .eq("organization_id", org)
    .is("deleted_at", null);
  expect(roles.data, "roles iniciales");
  const accounts = fixtures();
  for (const account of accounts) {
    const role = roles.data.find((item) => item.code === account.roleCode);
    expect(role, "plantilla de rol");
    const body = {
      organization_id: org,
      request_id: account.requestId,
      input: {
        email: account.email,
        full_name: account.fullName,
        password: account.password,
        member_type: account.memberType,
        is_admin: false,
        grants: [
          {
            scope: "company",
            company_id: companies.data[0].id,
            module: "tributario",
            role_id: role.id,
            active: true,
            overrides: [],
          },
        ],
      },
    };
    const first = await http(actor, "/api/admin/users", body);
    expect(
      first.status === 200,
      "alta administrativa: " + JSON.stringify(first.data),
    );
    const user = completed(first.data);
    const retry = await http(actor, "/api/admin/users", body);
    expect(
      completed(retry.data).user_id === user.user_id,
      "alta reintentada sin duplicados",
    );
    const member = await admin
      .from("organization_members")
      .select("id")
      .eq("organization_id", org)
      .eq("user_id", user.user_id!)
      .single();
    expect(member.data, "membresía creada");
    if (account.roleCode === "contador") {
      await ensureSecondGrant(
        actor,
        org,
        member.data.id,
        companies.data[1].id,
        role.id,
      );
    }
  }
  const clientAccount = accounts.find((item) => item.memberType === "client");
  await verifyRecovery(actor, org, companies.data[0].id);
  await verifyProfiles(accounts);
  expect(clientAccount, "fixture cliente");
  const clientSession = session();
  const clientContext = await login(
    clientSession,
    clientAccount.email,
    clientAccount.password,
  );
  expect(
    clientContext.companies.length === 1 &&
      !clientContext.capabilities.some((item) => item.action === "approve"),
    "alcance cliente por empresa y módulo",
  );
  const harmlessBody = {
    organization_id: org,
    request_id: randomUUID(),
    input: {
      email: "denied.h02@example.test",
      full_name: "Denied fixture",
      password: randomBytes(24).toString("base64url"),
      member_type: "client",
      is_admin: false,
      grants: [],
    },
  };
  expect(
    errorCode((await http(null, "/api/admin/users", harmlessBody)).data) ===
      "UNAUTHENTICATED",
    "endpoint sin sesión",
  );
  expect(
    errorCode(
      (await http(clientSession, "/api/admin/users", harmlessBody)).data,
    ) === "FORBIDDEN",
    "cliente no administra",
  );
  expect(
    errorCode(
      (
        await http(
          actor,
          "/api/admin/users",
          harmlessBody,
          "POST",
          "https://foreign.invalid",
        )
      ).data,
    ) === "FORBIDDEN",
    "CSRF",
  );
  const targetId = clientContext.profile.user_id;
  const profile = await admin
    .from("profiles")
    .select("revision")
    .eq("user_id", targetId)
    .single();
  expect(profile.data, "revisión de cuenta");
  const disabled = await http(
    actor,
    `/api/admin/users/${targetId}/enabled`,
    {
      organization_id: org,
      request_id: randomUUID(),
      input: { enabled: false, expected_revision: profile.data.revision },
    },
    "PATCH",
  );
  const disabledResult = completed(disabled.data);
  expect(
    errorCode((await clientSession.client.rpc("h02_context")).data) ===
      "FORBIDDEN",
    "cuenta inhabilitada",
  );
  const enabled = await http(
    actor,
    `/api/admin/users/${targetId}/enabled`,
    {
      organization_id: org,
      request_id: randomUUID(),
      input: { enabled: true, expected_revision: disabledResult.revision },
    },
    "PATCH",
  );
  const enabledResult = completed(enabled.data);
  expect(
    errorCode((await clientSession.client.rpc("h02_context")).data) ===
      "UNAUTHENTICATED",
    "rehabilitación no revive sesión revocada",
  );
  await login(clientSession, clientAccount.email, clientAccount.password);
  const passwordBody = {
    organization_id: org,
    request_id: randomUUID(),
    input: {
      password: clientAccount.password,
      expected_revision: enabledResult.revision,
    },
  };
  const password = await http(
    actor,
    `/api/admin/users/${targetId}/password`,
    passwordBody,
  );
  expect(password.status === 200, "cambio administrativo de contraseña");
  expect(
    completed(
      (await http(actor, `/api/admin/users/${targetId}/password`, passwordBody))
        .data,
    ).user_id === targetId,
    "contraseña idempotente",
  );
  expect(
    errorCode((await clientSession.client.rpc("h02_context")).data) ===
      "UNAUTHENTICATED",
    "contraseña revoca sesión admitida",
  );
  const lastAdmin = await http(
    actor,
    `/api/admin/users/${context.profile.user_id}/enabled`,
    {
      organization_id: org,
      request_id: randomUUID(),
      input: { enabled: false, expected_revision: context.profile.revision },
    },
    "PATCH",
  );
  expect(
    errorCode(lastAdmin.data) === "FORBIDDEN",
    "último administrador protegido en endpoint",
  );
  console.info(
    "H02 local: perfiles, reintentos, CSRF y sesiones verificados. Credenciales solo en test-results/local/h02-fixtures.json.",
  );
}

async function verifyProfiles(accounts: DemoIdentity[]) {
  for (const account of accounts) {
    const context = await login(session(), account.email, account.password);
    if (account.roleCode === "contador")
      expect(
        context.companies.length === 2 &&
          context.capabilities.some(
            (item) => item.module === "laboral_general",
          ) &&
          !context.capabilities.some(
            (item) => item.module === "laboral_trabajador",
          ),
        "contador con módulos diferentes por empresa",
      );
    if (account.roleCode === "supervisor")
      expect(
        context.capabilities.some((item) => item.action === "approve") &&
          !context.capabilities.some((item) => item.action === "upload"),
        "supervisor revisa sin entrega inicial",
      );
    if (account.roleCode === "cliente")
      expect(
        context.companies.length === 1 &&
          !context.capabilities.some((item) =>
            ["approve", "observe", "reopen"].includes(item.action),
          ),
        "cliente sin revisión ni empresas adicionales",
      );
  }
}

async function ensureSecondGrant(
  actor: HttpSession,
  org: string,
  memberId: string,
  companyId: string,
  roleId: string,
) {
  const existing = await admin
    .from("access_grants")
    .select("id")
    .eq("member_id", memberId)
    .eq("company_id", companyId)
    .eq("module", "laboral_general")
    .maybeSingle();
  if (existing.data) return;
  await command(actor, org, "AssignAccess", {
    member_id: memberId,
    scope: "company",
    company_id: companyId,
    module: "laboral_general",
    role_id: roleId,
    active: true,
    overrides: [],
  });
}

async function verifyRecovery(
  actor: HttpSession,
  org: string,
  companyId: string,
) {
  const path = LOCAL_H02_RECOVERY_FILE;
  const schema = z.object({
    email: z.email(),
    password: z.string(),
    requestId: z.uuid(),
  });
  if (!existsSync(path))
    writeFileSync(
      path,
      JSON.stringify({
        email: "recuperacion.h02@example.test",
        password: randomBytes(24).toString("base64url"),
        requestId: randomUUID(),
      }),
      { flag: "wx" },
    );
  const fixture = schema.parse(JSON.parse(readFileSync(path, "utf8")));
  const existing = await admin
    .from("profiles")
    .select("user_id")
    .eq("email", fixture.email)
    .maybeSingle();
  if (existing.data) return;
  const roleResult = await admin
    .from("roles")
    .select("*")
    .eq("organization_id", org)
    .eq("code", "h02_recuperable")
    .maybeSingle();
  const role = await command(actor, org, "SaveRole", {
    code: "h02_recuperable",
    name: "H02 · Prueba de recuperación",
    audience: "internal",
    active: false,
    permission_ids: [],
    ...(roleResult.data
      ? { id: roleResult.data.id, expected_revision: roleResult.data.revision }
      : {}),
  });
  const body = {
    organization_id: org,
    request_id: fixture.requestId,
    input: {
      email: fixture.email,
      full_name: "Recuperación H02",
      password: fixture.password,
      member_type: "internal",
      is_admin: false,
      grants: [
        {
          scope: "company",
          company_id: companyId,
          module: "tributario",
          role_id: role.resource_id,
          active: true,
          overrides: [],
        },
      ],
    },
  };
  const failed = await http(actor, "/api/admin/users", body);
  expect(
    errorCode(failed.data) === "VALIDATION_ERROR",
    "Auth creado y SQL rechazado por rol pausado",
  );
  const pending = await admin
    .from("operation_requests")
    .select("external_identity_id,status")
    .eq("organization_id", org)
    .eq("request_id", fixture.requestId)
    .single();
  expect(
    pending.data?.status === "failed" && pending.data.external_identity_id,
    "identidad externa conservada para reconciliación",
  );
  const identity = await admin.auth.admin.getUserById(
    pending.data.external_identity_id,
  );
  expect(identity.data.user, "Auth conservado tras fallo SQL");
  const incomplete = session();
  const signedIn = await incomplete.client.auth.signInWithPassword({
    email: fixture.email,
    password: fixture.password,
  });
  expect(
    !signedIn.error,
    "identidad externa verificable sin confirmación por correo",
  );
  expect(
    errorCode((await incomplete.client.rpc("h02_context")).data) ===
      "FORBIDDEN",
    "cuenta incompleta no entra al negocio",
  );
  await command(actor, org, "SaveRole", {
    id: role.resource_id,
    expected_revision: role.revision,
    code: "h02_recuperable",
    name: "H02 · Prueba de recuperación",
    audience: "internal",
    active: true,
    permission_ids: [],
  });
  const recovered = completed(
    (await http(actor, "/api/admin/users", body)).data,
  );
  expect(
    recovered.user_id === pending.data.external_identity_id,
    "reintento reutiliza la misma identidad Auth",
  );
  await login(incomplete, fixture.email, fixture.password);
  console.info(
    "H02 recovery: fallo entre Auth y SQL recuperado con el mismo request_id e identidad.",
  );
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Falló aceptación H02.",
  );
  process.exitCode = 1;
});

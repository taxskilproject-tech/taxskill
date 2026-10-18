import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "../src/lib/supabase/types/database.types";
import { canJoinPrivateNotice } from "./operations/repositories/security-channel";
import { createSecurityFixture } from "./operations/repositories/security-fixture";
import { requireLocalTestEnvironment } from "./utils/require-local-test-environment";
import { scriptResult } from "./utils/script-result";

async function main() {
  const url = requireLocalTestEnvironment();
  const fixture = await createSecurityFixture(url);
  const checks: string[] = [];
  function check(value: unknown, label: string) {
    if (!value) throw new Error("H08 API: " + label);
    checks.push(label);
  }
  const client = fixture.limited.client;
  const signIn = await client.auth.signInWithPassword({
    email: fixture.limited.user.email ?? "",
    password: fixture.limited.password,
  });
  check(
    !signIn.error && signIn.data.session,
    "login real con sesión admitida por Auth",
  );
  const context = await client.rpc("h02_context");
  check(
    !context.error &&
      context.data &&
      typeof context.data === "object" &&
      "ok" in context.data &&
      context.data.ok,
    "contexto autorizado desde API",
  );
  const session = z
    .object({ data: z.object({ session_id: z.uuid() }) })
    .parse(context.data).data.session_id;
  const topic = `personal-notices:${fixture.org.id}:${fixture.limited.user.id}:${session}`;
  check(
    await canJoinPrivateNotice(client, topic),
    "Realtime privado admite su sesión vigente",
  );
  check(
    !(await canJoinPrivateNotice(
      client,
      `personal-notices:${fixture.org.id}:${fixture.owner.user.id}:${session}`,
    )),
    "Realtime privado rechaza destinatario ajeno",
  );
  const companies = scriptResult(
    await client.from("companies").select("id,organization_id"),
    "No se pudo verificar empresas H08.",
  );
  check(
    companies.length === 2 &&
      companies.every((company) => company.organization_id === fixture.org.id),
    "Data API aísla estudios",
  );
  const workers = scriptResult(
    await client.from("workers").select("id,company_id"),
    "No se pudo verificar trabajadores H08.",
  );
  check(
    workers.length === 1 && workers[0].company_id === fixture.companyB.id,
    "Data API aplica permisos distintos por módulo",
  );
  const profiles = scriptResult(
    await client.from("profiles").select("user_id"),
    "No se pudo verificar perfiles H08.",
  );
  check(
    profiles.length === 1 && profiles[0].user_id === fixture.limited.user.id,
    "perfil ajeno no expone contacto",
  );
  const inserted = await client.from("companies").insert({
    organization_id: fixture.org.id,
    ruc: "20999999899",
    legal_name: "H08 forbidden",
    control_start_date: "2026-10-17",
  });
  check(inserted.error?.code === "42501", "mutación directa bloqueada");
  const tokenLeak = await client
    .from("upload_intents")
    .select("validation_token");
  check(tokenLeak.error?.code === "42501", "token de validación no expuesto");
  const anon = createClient<Database>(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    { auth: { persistSession: false } },
  );
  check(
    Boolean((await anon.from("companies").select("id")).error),
    "anónimo no lee datos de empresa",
  );
  const selfPassword = await client.auth.updateUser({
    password: "H08-self-service-blocked-password",
  });
  check(Boolean(selfPassword.error), "Auth directo no cambia contraseña");
  const recovery = await client.auth.resetPasswordForEmail(
    fixture.limited.user.email ?? "",
  );
  check(Boolean(recovery.error), "recuperación por correo bloqueada en Auth");
  const foreign = await client.rpc("h07_query", {
    p_organization_id: fixture.foreignOrg.id,
    p_resource: "dashboard",
    p_input: {},
  });
  check(
    JSON.stringify(foreign.data).includes("FORBIDDEN"),
    "RPC rechaza estudio ajeno",
  );
  const directFile = await client.storage
    .from("documents")
    .upload(`h08/${randomUUID()}.pdf`, new Uint8Array([1, 2, 3]));
  check(Boolean(directFile.error), "Storage rechaza escritura final directa");
  const grant = fixture.grants.find(
    (item) => item.company_id === fixture.companyA.id,
  );
  if (!grant) throw new Error("Asignación H08 no disponible.");
  const removed = await fixture.admin
    .from("access_grants")
    .update({ active: false })
    .eq("id", grant.id);
  check(!removed.error, "retirada de permiso preparada");
  check(
    scriptResult(
      await client.from("companies").select("id"),
      "Consulta de revocación fallida.",
    ).length === 1,
    "retirada de permiso se aplica al token vigente",
  );
  const profile = scriptResult(
    await fixture.admin
      .from("profiles")
      .select("revision")
      .eq("user_id", fixture.limited.user.id)
      .single(),
    "Perfil H08 no disponible.",
  );
  const requestId = randomUUID();
  const prepared = scriptResult(
    await fixture.admin.rpc("h02_admin_prepare", {
      p_organization_id: fixture.org.id,
      p_actor_id: fixture.owner.user.id,
      p_request_id: requestId,
      p_operation: "SetUserPassword",
      p_input_hash: "a".repeat(64),
      p_target_id: fixture.limited.user.id,
    }),
    "No se pudo preparar cambio administrativo.",
  );
  if (
    !prepared ||
    Array.isArray(prepared) ||
    typeof prepared !== "object" ||
    typeof prepared.id !== "string"
  )
    throw new Error("Operación H08 inválida.");
  const stage = await fixture.admin.rpc("h02_admin_stage", {
    p_operation_id: prepared.id,
    p_input: { expected_revision: profile.revision },
  });
  check(!stage.error, "etapa SQL revoca sesiones antes de Auth");
  const newPassword = "H08-admin-" + randomUUID();
  const changed = await fixture.admin.auth.admin.updateUserById(
    fixture.limited.user.id,
    {
      password: newPassword,
      app_metadata: { taxskill_password_request_id: prepared.id },
    },
  );
  check(
    !changed.error,
    "Auth permite contraseña con intención administrativa verificada",
  );
  const finished = await fixture.admin.rpc("h02_admin_finish", {
    p_operation_id: prepared.id,
    p_input: { expected_revision: profile.revision },
  });
  check(!finished.error, "cambio administrativo recuperable finaliza");
  check(
    scriptResult(
      await client.from("companies").select("id"),
      "Consulta de sesión revocada fallida.",
    ).length === 0,
    "token anterior deja de leer tras cambio de contraseña",
  );
  await client.auth.refreshSession();
  const refreshedRead = await client.from("companies").select("id");
  check(
    refreshedRead.error?.code === "42501" || refreshedRead.data?.length === 0,
    "refresh no readmite una sesión revocada",
  );
  const newLogin = await client.auth.signInWithPassword({
    email: fixture.limited.user.email ?? "",
    password: newPassword,
  });
  check(!newLogin.error, "nuevo login con contraseña administrativa");
  check(
    scriptResult(
      await client.from("companies").select("id"),
      "Consulta nueva sesión fallida.",
    ).length === 1,
    "nueva sesión conserva solamente permisos actuales",
  );
  const disabled = await fixture.admin
    .from("organization_members")
    .update({ active: false })
    .eq("id", fixture.member.id);
  check(!disabled.error, "inhabilitación de membresía preparada");
  check(
    scriptResult(
      await client.from("companies").select("id"),
      "Consulta de membresía inactiva fallida.",
    ).length === 0,
    "membresía inactiva pierde acceso directo",
  );
  const enabled = await fixture.admin
    .from("organization_members")
    .update({ active: true })
    .eq("id", fixture.member.id);
  check(!enabled.error, "rehabilitación preparada");
  check(
    scriptResult(
      await client.from("companies").select("id"),
      "Consulta tras rehabilitar fallida.",
    ).length === 0,
    "rehabilitar no reactiva sesión anterior",
  );
  check(
    !(await canJoinPrivateNotice(client, topic)),
    "Realtime privado rechaza una sesión anterior revocada",
  );
  mkdirSync("test-results/local/h08", { recursive: true });
  writeFileSync(
    "test-results/local/h08/security-api.json",
    JSON.stringify(
      { target: "Docker local", checks, count: checks.length, passed: true },
      null,
      2,
    ),
  );
  await client.auth.signOut({ scope: "local" });
  console.info(
    `H08 API: ${checks.length} comprobaciones aprobadas exclusivamente en Docker local.`,
  );
}
void main().catch((cause: unknown) => {
  console.error(
    cause instanceof Error ? cause.message : "H08 API no completado.",
  );
  process.exitCode = 1;
});
